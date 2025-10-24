# 小说创作工具需求文档

## 项目概述
基于现有的 Writing Assistant 应用,扩展为小说创作工具。支持网页版(IndexedDB)和 Tauri 版(本地文件)双环境。

## 技术栈
- **前端**: Next.js 14 + React 18 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **数据存储**: 
  - 网页版: IndexedDB
  - Tauri版: 本地文件系统(JSON)
- **AI服务**: DeepSeek (默认) + 用户自定义 API
- **现有组件**: WritingModal (左侧编辑器 70% + 右侧面板 30%)

---

## 核心功能模块

### 1. 人物卡片组件 (CharacterCard) - 优先级 1

#### 1.1 数据结构
```typescript
interface Character {
  id: string;                    // UUID
  name: string;                  // 人物名称
  avatar?: string;               // 头像URL
  basicInfo: {
    age?: number;
    gender?: string;
    occupation?: string;
    description?: string;        // 基础描述
  };
  timeline: CharacterTimelineEvent[];  // 人物时间线
  relationships: CharacterRelationship[];  // 人物关系
  references: Reference[];       // 引用记录(来自写作)
  createdAt: Date;
  updatedAt: Date;
}

interface CharacterTimelineEvent {
  id: string;
  date: string;                  // 支持精确日期(YYYY-MM-DD)或灵活描述("春天")
  eventType: 'birth' | 'death' | 'custom';
  title: string;
  description?: string;
  relatedCharacters?: string[];  // 关联人物ID
  relatedLocations?: string[];   // 关联地点ID
}

interface CharacterRelationship {
  id: string;
  targetCharacterId: string;     // 关联的人物ID
  relationshipType: string;      // 关系类型(可自定义: "家人", "朋友", "敌人"等)
  description?: string;
  isBidirectional: boolean;      // 是否双向关联
}

interface Reference {
  id: string;
  chapterId: string;             // 章节ID
  content: string;               // 引用内容片段
  createdAt: Date;
}
```

#### 1.2 UI组件
```
CharacterCard (卡片视图)
├── Header
│   ├── Avatar
│   ├── Name
│   └── Actions (编辑/删除)
├── BasicInfo (基础信息)
│   ├── Age, Gender, Occupation
│   └── Description
├── Timeline (时间线 - 可折叠)
│   └── TimelineEvent[] (按时间排序)
├── Relationships (关系网络 - 可折叠)
│   └── RelationshipItem[] (可点击跳转到关联人物)
└── References (引用记录 - 可折叠)
    └── ReferenceItem[] (可点击跳转到章节)
```

#### 1.3 功能
- 创建/编辑/删除人物
- 添加/编辑时间线事件
- 查询其他人物并建立关联(支持自定义关系类型)
- 双向关联自动同步
- 查看引用记录(从写作中自动添加)

---

### 2. 地点卡片组件 (LocationCard) - 优先级 2

#### 2.1 数据结构
```typescript
interface Location {
  id: string;
  name: string;
  image?: string;                // 地点图片
  description?: string;
  type?: string;                 // 地点类型(城市/建筑/自然景观等)
  relatedCharacters?: string[];  // 关联人物
  relatedEvents?: string[];      // 关联事件
  references: Reference[];       // 引用记录
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2.2 UI组件
```
LocationCard (卡片视图)
├── Header
│   ├── Image
│   ├── Name
│   └── Actions (编辑/删除)
├── BasicInfo
│   ├── Type
│   └── Description
├── RelatedCharacters (关联人物 - 可折叠)
│   └── CharacterLink[] (可点击跳转)
└── References (引用记录 - 可折叠)
    └── ReferenceItem[]
```

#### 2.3 功能
- 创建/编辑/删除地点
- 关联人物和事件
- 查看引用记录

---

### 3. 写作 Modal (章节写作模式) - 优先级 3

#### 3.1 基于现有 WritingModal 扩展

**现有布局**: 左侧编辑器(70%) + 右侧面板(30%)

**扩展内容**:

##### 右侧面板新增 Tab: "Novel Context"
```
RightPanel
├── Tab: Suggestions (现有)
├── Tab: Agent Chat (现有)
└── Tab: Novel Context (新增)
    ├── Section: 当前章节信息
    │   ├── 卷/章/节 层级显示
    │   └── 章节标题
    ├── Section: 关联人物
    │   ├── 人物选择器 (多选)
    │   └── 已选人物列表 (显示基础信息)
    ├── Section: 关联地点
    │   ├── 地点选择器 (多选)
    │   └── 已选地点列表
    ├── Section: 情节概括
    │   └── Textarea (用户输入)
    └── Section: Prompt 设定
        ├── 全局 Prompt (系统级)
        └── 当前章节 Prompt (用户自定义)
```

##### 新增功能按钮
```
EditorToolbar (左侧编辑器顶部)
├── 现有按钮 (保存/分析等)
└── 新增: "生成初稿" 按钮
    └── 功能: 根据右侧 Novel Context 生成初稿
```

#### 3.2 生成初稿逻辑
```
伪代码:
function generateDraft() {
  // 1. 收集上下文
  context = {
    chapterInfo: getCurrentChapterInfo(),
    characters: getSelectedCharacters(),  // 包含人物基础信息和时间线
    locations: getSelectedLocations(),
    plotSummary: getPlotSummary(),
    globalPrompt: getGlobalPrompt(),
    chapterPrompt: getChapterPrompt()
  }
  
  // 2. 构建 AI Prompt
  prompt = buildNovelPrompt(context)
  
  // 3. 调用 AI API (DeepSeek 默认)
  response = await callAI(prompt, settings.apiToken, settings.aiModel || 'deepseek-chat')
  
  // 4. 插入编辑器
  insertTextToEditor(response.content)
  
  // 5. 自动添加 Reference
  addReferenceToCharacters(selectedCharacters, response.content, currentChapterId)
  addReferenceToLocations(selectedLocations, response.content, currentChapterId)
}
```

#### 3.3 Reference 自动添加
- 用户在右侧面板选择关联人物/地点
- 生成初稿或保存章节时,自动将内容片段添加到对应人物/地点的 `references` 数组
- Reference 包含: 章节ID、内容片段、创建时间

---

### 4. 时间线页面 (TimelinePage) - 优先级 4

#### 4.1 页面结构
```
TimelinePage
├── Header
│   ├── 标题: "世界时间线"
│   └── 添加事件按钮
├── MainTimeline (主线剧情)
│   └── TimelineEvent[] (按时间排序)
│       ├── Date
│       ├── Title
│       ├── Description
│       └── Type (世界事件/背景变化)
└── CharacterTimelines (人物时间线 - 可选显示)
    ├── 人物选择器 (多选)
    └── CharacterTimelineTrack[] (每个人物一条轨道)
        └── TimelineEvent[] (出生/事件/死亡)
```

#### 4.2 数据结构
```typescript
interface WorldTimelineEvent {
  id: string;
  date: string;                  // 精确日期或灵活描述
  title: string;
  description?: string;
  type: 'world' | 'background';
  relatedCharacters?: string[];
  relatedLocations?: string[];
}
```

#### 4.3 功能
- 添加/编辑/删除世界事件
- 选择人物,叠加显示人物时间线
- 时间线可视化(横向时间轴)
- 点击事件查看详情

---

## 数据存储方案

### 网页版 (IndexedDB)
```typescript
// 数据库名称: NovelWritingDB
// 版本: 1

// Object Stores:
1. characters: { keyPath: 'id' }
2. locations: { keyPath: 'id' }
3. worldTimeline: { keyPath: 'id' }
4. chapters: { keyPath: 'id' }  // 章节内容
5. settings: { keyPath: 'key' }  // 用户设置
```

### Tauri 版 (本地文件)
```
项目目录结构:
/novel-project/
├── characters/
│   ├── {character-id}.json
│   └── ...
├── locations/
│   ├── {location-id}.json
│   └── ...
├── chapters/
│   ├── volume-1/
│   │   ├── chapter-1/
│   │   │   ├── section-1.json
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── timeline.json              // 世界时间线
└── settings.json              // 项目设置
```

---

## 环境检测

```typescript
// lib/platform-utils.ts
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

function getStorageAdapter(): StorageAdapter {
  if (isTauriEnvironment()) {
    return new TauriFileStorage();
  } else {
    return new IndexedDBStorage();
  }
}
```

---

## API 路由

### 新增 API 端点
```
POST /api/novel/generate-draft
  - 输入: { context, prompt, apiToken, model }
  - 输出: { content }
  - 功能: 调用 DeepSeek API 生成初稿
```

---

## 页面路由

根据 Next.js 最佳实践:
```
/[locale]/novel/
├── characters/              # 人物管理页面
│   ├── page.tsx            # 人物列表
│   └── [id]/page.tsx       # 人物详情
├── locations/              # 地点管理页面
│   ├── page.tsx
│   └── [id]/page.tsx
├── timeline/               # 时间线页面
│   └── page.tsx
└── writing/                # 写作页面
    └── [chapterId]/page.tsx
```

---

## 实现优先级

1. **人物卡片组件** (CharacterCard + 数据存储)
2. **地点卡片组件** (LocationCard + 数据存储)
3. **写作 Modal 扩展** (Novel Context Tab + 生成初稿)
4. **时间线页面** (TimelinePage)

---

## 待办事项 (暂不实现)

5. 大纲写作 Mode
6. 人物写作 Mode
7. 地点写作 Mode

