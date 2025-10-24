# 小说创作工具实现文档

## 实现策略

遵循**最小侵入原则**,使用简洁优雅的方案,避免过度修改现有代码。

---

## 阶段一: 基础设施 (Foundation)

### 1.1 环境检测与存储适配器

**文件**: `saas-starter-base/src/lib/novel/platform-utils.ts`

```typescript
// 伪代码
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export interface StorageAdapter {
  // CRUD operations
  create(collection: string, data: any): Promise<string>
  read(collection: string, id: string): Promise<any>
  update(collection: string, id: string, data: any): Promise<void>
  delete(collection: string, id: string): Promise<void>
  list(collection: string): Promise<any[]>
}

export function getStorageAdapter(): StorageAdapter {
  if (isTauriEnvironment()) {
    return new TauriFileStorage()
  } else {
    return new IndexedDBStorage()
  }
}
```

### 1.2 IndexedDB 实现

**文件**: `saas-starter-base/src/lib/novel/storage/indexeddb-storage.ts`

```typescript
// 伪代码
class IndexedDBStorage implements StorageAdapter {
  private dbName = 'NovelWritingDB'
  private version = 1
  
  async init() {
    // 打开数据库
    db = await openDB(dbName, version, {
      upgrade(db) {
        // 创建 Object Stores
        db.createObjectStore('characters', { keyPath: 'id' })
        db.createObjectStore('locations', { keyPath: 'id' })
        db.createObjectStore('worldTimeline', { keyPath: 'id' })
        db.createObjectStore('chapters', { keyPath: 'id' })
        db.createObjectStore('novelSettings', { keyPath: 'key' })
      }
    })
  }
  
  async create(collection, data) {
    data.id = generateUUID()
    data.createdAt = new Date()
    data.updatedAt = new Date()
    await db.put(collection, data)
    return data.id
  }
  
  async read(collection, id) {
    return await db.get(collection, id)
  }
  
  async update(collection, id, data) {
    data.updatedAt = new Date()
    await db.put(collection, data)
  }
  
  async delete(collection, id) {
    await db.delete(collection, id)
  }
  
  async list(collection) {
    return await db.getAll(collection)
  }
}
```

### 1.3 Tauri 文件存储实现

**文件**: `saas-starter-base/src/lib/novel/storage/tauri-file-storage.ts`

```typescript
// 伪代码
import { invoke } from '@tauri-apps/api/core'
import { readTextFile, writeTextFile, readDir, removeFile } from '@tauri-apps/plugin-fs'

class TauriFileStorage implements StorageAdapter {
  private basePath = 'novel-project'
  
  async create(collection, data) {
    data.id = generateUUID()
    data.createdAt = new Date()
    data.updatedAt = new Date()
    
    filePath = `${basePath}/${collection}/${data.id}.json`
    await writeTextFile(filePath, JSON.stringify(data, null, 2))
    return data.id
  }
  
  async read(collection, id) {
    filePath = `${basePath}/${collection}/${id}.json`
    content = await readTextFile(filePath)
    return JSON.parse(content)
  }
  
  async update(collection, id, data) {
    data.updatedAt = new Date()
    filePath = `${basePath}/${collection}/${id}.json`
    await writeTextFile(filePath, JSON.stringify(data, null, 2))
  }
  
  async delete(collection, id) {
    filePath = `${basePath}/${collection}/${id}.json`
    await removeFile(filePath)
  }
  
  async list(collection) {
    dirPath = `${basePath}/${collection}`
    entries = await readDir(dirPath)
    results = []
    for (entry of entries) {
      if (entry.name.endsWith('.json')) {
        content = await readTextFile(entry.path)
        results.push(JSON.parse(content))
      }
    }
    return results
  }
}
```

### 1.4 数据类型定义

**文件**: `saas-starter-base/src/lib/novel/types.ts`

```typescript
// 伪代码
export interface Character {
  id: string
  name: string
  avatar?: string
  basicInfo: {
    age?: number
    gender?: string
    occupation?: string
    description?: string
  }
  timeline: CharacterTimelineEvent[]
  relationships: CharacterRelationship[]
  references: Reference[]
  createdAt: Date
  updatedAt: Date
}

export interface CharacterTimelineEvent {
  id: string
  date: string  // YYYY-MM-DD or flexible like "春天"
  eventType: 'birth' | 'death' | 'custom'
  title: string
  description?: string
  relatedCharacters?: string[]
  relatedLocations?: string[]
}

export interface CharacterRelationship {
  id: string
  targetCharacterId: string
  relationshipType: string  // 可自定义
  description?: string
  isBidirectional: boolean
}

export interface Location {
  id: string
  name: string
  image?: string
  description?: string
  type?: string
  relatedCharacters?: string[]
  relatedEvents?: string[]
  references: Reference[]
  createdAt: Date
  updatedAt: Date
}

export interface Reference {
  id: string
  chapterId: string
  content: string
  createdAt: Date
}

export interface WorldTimelineEvent {
  id: string
  date: string
  title: string
  description?: string
  type: 'world' | 'background'
  relatedCharacters?: string[]
  relatedLocations?: string[]
}
```

---

## 阶段二: 人物卡片组件 (优先级 1)

### 2.1 人物数据管理 Hook

**文件**: `saas-starter-base/src/lib/novel/hooks/use-characters.ts`

```typescript
// 伪代码
export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([])
  const storage = getStorageAdapter()
  
  async function loadCharacters() {
    list = await storage.list('characters')
    setCharacters(list)
  }
  
  async function createCharacter(data: Partial<Character>) {
    id = await storage.create('characters', {
      ...data,
      timeline: [],
      relationships: [],
      references: []
    })
    await loadCharacters()
    return id
  }
  
  async function updateCharacter(id: string, data: Partial<Character>) {
    await storage.update('characters', id, data)
    await loadCharacters()
  }
  
  async function deleteCharacter(id: string) {
    await storage.delete('characters', id)
    await loadCharacters()
  }
  
  async function addRelationship(characterId: string, relationship: CharacterRelationship) {
    character = await storage.read('characters', characterId)
    character.relationships.push(relationship)
    await storage.update('characters', characterId, character)
    
    // 双向关联
    if (relationship.isBidirectional) {
      targetCharacter = await storage.read('characters', relationship.targetCharacterId)
      reverseRelationship = {
        id: generateUUID(),
        targetCharacterId: characterId,
        relationshipType: relationship.relationshipType,
        description: relationship.description,
        isBidirectional: true
      }
      targetCharacter.relationships.push(reverseRelationship)
      await storage.update('characters', relationship.targetCharacterId, targetCharacter)
    }
    
    await loadCharacters()
  }
  
  useEffect(() => {
    loadCharacters()
  }, [])
  
  return {
    characters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    addRelationship
  }
}
```

### 2.2 人物卡片组件

**文件**: `saas-starter-base/src/components/novel/CharacterCard.tsx`

```typescript
// 伪代码
export function CharacterCard({ character, onEdit, onDelete }) {
  const [expandedSections, setExpandedSections] = useState({
    timeline: false,
    relationships: false,
    references: false
  })
  
  return (
    <Card>
      <CardHeader>
        <Avatar src={character.avatar} />
        <h3>{character.name}</h3>
        <Button onClick={() => onEdit(character)}>编辑</Button>
        <Button onClick={() => onDelete(character.id)}>删除</Button>
      </CardHeader>
      
      <CardContent>
        {/* 基础信息 */}
        <div>
          <p>年龄: {character.basicInfo.age}</p>
          <p>性别: {character.basicInfo.gender}</p>
          <p>职业: {character.basicInfo.occupation}</p>
          <p>描述: {character.basicInfo.description}</p>
        </div>
        
        {/* 时间线 */}
        <Collapsible open={expandedSections.timeline}>
          <CollapsibleTrigger>时间线 ({character.timeline.length})</CollapsibleTrigger>
          <CollapsibleContent>
            {character.timeline.map(event => (
              <TimelineEventItem key={event.id} event={event} />
            ))}
          </CollapsibleContent>
        </Collapsible>
        
        {/* 关系网络 */}
        <Collapsible open={expandedSections.relationships}>
          <CollapsibleTrigger>关系 ({character.relationships.length})</CollapsibleTrigger>
          <CollapsibleContent>
            {character.relationships.map(rel => (
              <RelationshipItem key={rel.id} relationship={rel} />
            ))}
          </CollapsibleContent>
        </Collapsible>
        
        {/* 引用记录 */}
        <Collapsible open={expandedSections.references}>
          <CollapsibleTrigger>引用 ({character.references.length})</CollapsibleTrigger>
          <CollapsibleContent>
            {character.references.map(ref => (
              <ReferenceItem key={ref.id} reference={ref} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
```

### 2.3 人物列表页面

**文件**: `saas-starter-base/src/app/[locale]/novel/characters/page.tsx`

```typescript
// 伪代码
export default function CharactersPage() {
  const { characters, createCharacter, updateCharacter, deleteCharacter } = useCharacters()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  return (
    <div>
      <h1>人物管理</h1>
      <Button onClick={() => setIsCreateDialogOpen(true)}>创建人物</Button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map(character => (
          <CharacterCard
            key={character.id}
            character={character}
            onEdit={(char) => {/* 打开编辑对话框 */}}
            onDelete={deleteCharacter}
          />
        ))}
      </div>
      
      <CreateCharacterDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={createCharacter}
      />
    </div>
  )
}
```

---

## 阶段三: 地点卡片组件 (优先级 2)

### 3.1 地点数据管理 Hook

**文件**: `saas-starter-base/src/lib/novel/hooks/use-locations.ts`

```typescript
// 伪代码 (类似 use-characters.ts)
export function useLocations() {
  // 类似实现
  return {
    locations,
    createLocation,
    updateLocation,
    deleteLocation
  }
}
```

### 3.2 地点卡片组件

**文件**: `saas-starter-base/src/components/novel/LocationCard.tsx`

```typescript
// 伪代码 (类似 CharacterCard)
export function LocationCard({ location, onEdit, onDelete }) {
  // 类似实现
}
```

---

## 阶段四: 写作 Modal 扩展 (优先级 3)

### 4.1 扩展 WritingModal Props

**文件**: `saas-starter-base/src/components/WritingModal.tsx`

```typescript
// 伪代码 - 在现有 WritingModalProps 中添加
interface WritingModalProps {
  // ... 现有 props
  
  // 新增: 小说上下文
  novelContext?: {
    chapterInfo?: {
      volume: string
      chapter: string
      section: string
      title: string
    }
    selectedCharacters?: Character[]
    selectedLocations?: Location[]
    plotSummary?: string
    globalPrompt?: string
    chapterPrompt?: string
  }
  onNovelContextChange?: (context: NovelContext) => void
  onGenerateDraft?: () => void
}
```

### 4.2 添加 Novel Context Tab

**修改位置**: `WritingModal.tsx` 右侧面板

```typescript
// 伪代码
// 在右侧面板添加新 Tab
<div className="mb-4">
  <div className="flex gap-2 border-b">
    <button onClick={() => setRightPanelView('suggestions')}>Suggestions</button>
    <button onClick={() => setRightPanelView('agent')}>Agent Chat</button>
    <button onClick={() => setRightPanelView('novelContext')}>Novel Context</button>  {/* 新增 */}
  </div>
</div>

{/* 新增 Novel Context 视图 */}
{rightPanelView === 'novelContext' && (
  <NovelContextPanel
    context={novelContext}
    onChange={onNovelContextChange}
  />
)}
```

### 4.3 Novel Context Panel 组件

**文件**: `saas-starter-base/src/components/novel/NovelContextPanel.tsx`

```typescript
// 伪代码
export function NovelContextPanel({ context, onChange }) {
  const { characters } = useCharacters()
  const { locations } = useLocations()
  
  return (
    <div className="space-y-4">
      {/* 章节信息 */}
      <section>
        <h4>章节信息</h4>
        <p>{context.chapterInfo.volume} > {context.chapterInfo.chapter} > {context.chapterInfo.section}</p>
        <p>{context.chapterInfo.title}</p>
      </section>
      
      {/* 关联人物 */}
      <section>
        <h4>关联人物</h4>
        <MultiSelect
          options={characters}
          value={context.selectedCharacters}
          onChange={(selected) => onChange({ ...context, selectedCharacters: selected })}
        />
        {context.selectedCharacters.map(char => (
          <CharacterSummary key={char.id} character={char} />
        ))}
      </section>
      
      {/* 关联地点 */}
      <section>
        <h4>关联地点</h4>
        <MultiSelect
          options={locations}
          value={context.selectedLocations}
          onChange={(selected) => onChange({ ...context, selectedLocations: selected })}
        />
      </section>
      
      {/* 情节概括 */}
      <section>
        <h4>情节概括</h4>
        <Textarea
          value={context.plotSummary}
          onChange={(e) => onChange({ ...context, plotSummary: e.target.value })}
        />
      </section>
      
      {/* Prompt 设定 */}
      <section>
        <h4>Prompt 设定</h4>
        <Textarea
          label="全局 Prompt"
          value={context.globalPrompt}
          onChange={(e) => onChange({ ...context, globalPrompt: e.target.value })}
        />
        <Textarea
          label="章节 Prompt"
          value={context.chapterPrompt}
          onChange={(e) => onChange({ ...context, chapterPrompt: e.target.value })}
        />
      </section>
    </div>
  )
}
```

### 4.4 生成初稿功能

**文件**: `saas-starter-base/src/app/api/novel/generate-draft/route.ts`

```typescript
// 伪代码
export async function POST(request: Request) {
  const { context, apiToken, model } = await request.json()
  
  // 构建 Prompt
  prompt = buildNovelPrompt(context)
  
  // 调用 DeepSeek API
  response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }]
    })
  })
  
  data = await response.json()
  return Response.json({ content: data.choices[0].message.content })
}

function buildNovelPrompt(context) {
  return `
你是一位专业的小说作家。请根据以下信息创作章节内容:

章节信息: ${context.chapterInfo.volume} > ${context.chapterInfo.chapter} > ${context.chapterInfo.section}
标题: ${context.chapterInfo.title}

人物信息:
${context.selectedCharacters.map(char => `
- ${char.name}: ${char.basicInfo.description}
`).join('\n')}

地点信息:
${context.selectedLocations.map(loc => `
- ${loc.name}: ${loc.description}
`).join('\n')}

情节概括: ${context.plotSummary}

全局要求: ${context.globalPrompt}
章节要求: ${context.chapterPrompt}

请创作这一章节的内容。
  `.trim()
}
```

---

## 实现记录

### 2025-01-XX 写作Modal扩展完成

**修改位置**: `saas-starter-base/src/components/WritingModal.tsx`

**修改内容**:
1. 添加导入:
   - `NovelContext` 类型
   - `NovelContextPanel` 组件

2. 扩展 `WritingModalProps`:
   ```typescript
   novelContext?: NovelContext;
   onNovelContextChange?: (context: NovelContext) => void;
   onGenerateDraft?: () => void;
   isGeneratingDraft?: boolean;
   ```

3. 修改右侧面板视图状态:
   ```typescript
   // 从 'suggestions' | 'agent' 扩展为:
   'suggestions' | 'agent' | 'novelContext'
   ```

4. 添加 Novel Tab (第873-908行):
   - 条件渲染: 仅当 `novelContext` 和 `onNovelContextChange` 存在时显示
   - Tab 标签: "Novel"

5. 添加 Novel Context 视图 (第1089-1093行):
   ```typescript
   rightPanelView === 'novelContext' && novelContext && onNovelContextChange ? (
     <NovelContextPanel
       context={novelContext}
       onChange={onNovelContextChange}
     />
   ) : null
   ```

6. 添加"生成初稿"按钮 (第815-834行):
   - 位置: 编辑器标题栏右侧
   - 条件渲染: 仅当 `novelContext` 和 `onGenerateDraft` 存在时显示
   - 状态: 根据 `isGeneratingDraft` 显示加载动画
   - 图标: 闪电图标 + "生成初稿"文字

**修改原因**:
- 为小说创作模式添加专用的上下文管理面板
- 支持一键生成初稿功能
- 保持与现有 Suggestions 和 Chat 功能的一致性

**创建文件**:
- `saas-starter-base/src/app/api/novel/generate-draft/route.ts` - 生成初稿 API 路由
- `saas-starter-base/src/components/novel/NovelContextPanel.tsx` - Novel Context 面板组件

---

## 实现顺序总结

1. ✅ 基础设施: 环境检测 + 存储适配器 + 类型定义
2. ✅ 人物卡片: Hook + 组件 + 页面
3. ✅ 地点卡片: Hook + 组件 + 页面
4. ✅ 写作 Modal: Novel Context Tab + 生成初稿 API
5. ✅ 时间线页面: 世界时间线 + 人物时间线可视化

---

## 阶段五: 时间线页面 (优先级 4) - 2025-10-23

### 5.1 世界时间线 Hook

**文件**: `saas-starter-base/src/lib/novel/hooks/use-world-timeline.ts`

**修改内容**:
- 创建 `useWorldTimeline` Hook 管理世界事件
- 使用 `useRef` + `useEffect` 异步初始化存储适配器
- 提供 CRUD 操作: `createEvent`, `updateEvent`, `deleteEvent`
- 实现日期排序功能,支持精确日期和灵活描述

**伪代码**:
```typescript
export function useWorldTimeline() {
  const [events, setEvents] = useState<WorldTimelineEvent[]>([])
  const storageRef = useRef<StorageAdapter | null>(null)

  useEffect(() => {
    getStorageAdapter().then(adapter => {
      storageRef.current = adapter
      loadEvents()
    })
  }, [])

  async function loadEvents() {
    const list = await storage.list('worldTimeline')
    const sorted = list.sort((a, b) => compareDates(a.date, b.date))
    setEvents(sorted)
  }

  async function createEvent(data) {
    const id = await storage.create('worldTimeline', data)
    await loadEvents()
    return id
  }

  // updateEvent, deleteEvent...

  return { events, loading, error, createEvent, updateEvent, deleteEvent }
}

function compareDates(a: string, b: string): number {
  // 尝试解析为日期,否则按字符串比较
  const dateA = new Date(a)
  const dateB = new Date(b)
  if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
    return dateA.getTime() - dateB.getTime()
  }
  return a.localeCompare(b)
}
```

### 5.2 时间线页面

**文件**: `saas-starter-base/src/app/[locale]/novel/timeline/page.tsx`

**修改内容**:
- 创建时间线页面,包含世界事件和人物时间线
- 使用 `useWorldTimeline` 和 `useCharacters` Hooks
- 实现人物选择器,支持多选显示人物时间线
- 创建/编辑/删除世界事件对话框
- 时间线可视化展示

**页面结构**:
```
TimelinePage
├── Header
│   ├── 标题: "世界时间线"
│   └── 添加事件按钮 (Dialog)
├── 人物选择器 (Card)
│   └── 人物标签按钮 (多选)
├── 世界事件列表
│   └── EventCard[]
│       ├── 日期标签
│       ├── 类型标签 (世界事件/背景变化)
│       ├── 标题 + 描述
│       └── 编辑/删除按钮
└── 人物时间线 (选中人物时显示)
    └── CharacterTimelineCard[]
        └── TimelineEvent[]
```

**功能实现**:
- 创建事件: Dialog 表单 (日期, 标题, 类型, 描述)
- 编辑事件: 点击编辑按钮打开 Dialog
- 删除事件: 确认后删除
- 人物选择: 点击人物标签切换选中状态
- 人物时间线: 显示选中人物的 timeline 事件

**测试结果**:
- ✅ 页面成功加载 (GET /en/novel/timeline 200)
- ✅ 世界事件列表正常显示
- ✅ 人物选择器正常工作
- ✅ 创建/编辑/删除对话框正常

**修改位置**: 新建文件
**修改时间**: 2025-10-23
**修改原因**: 实现时间线页面功能,支持世界事件和人物时间线可视化

