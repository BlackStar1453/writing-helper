# Timeline 重新生成内容功能修复

## 问题概述

在 Timeline 重新生成内容功能中发现了两个关键问题:

1. **使用过时的内容版本**: 重新生成时使用的是数据库中保存的章节内容,而不是用户当前正在编辑的最新内容
2. **内容插入位置错误**: 重新生成的内容总是被添加到文章末尾,而不是对应的 timeline 节点位置

## 问题详情

### 问题 1: 使用过时的内容版本

**现象**:
- 用户在编辑器中修改了内容,但还未点击保存
- 点击 timeline 节点的"重新生成"按钮
- 重新生成的内容基于数据库中的旧版本,用户的所有修改都会在重新生成后被覆盖

**根本原因**:
```typescript
// 在 handleRegenerateTimelineContent 中
const requestData = {
  currentContent: chapter.content || '',  // ❌ 使用的是数据库中的内容
  // ...
};
```

`chapter.content` 是从数据库加载的内容,不包含用户在编辑器中的最新修改。

**影响**:
- 用户体验极差,可能导致数据丢失
- 用户需要先保存,再重新生成,增加了操作步骤

### 问题 2: 内容插入位置错误

**现象**:
- 重新生成的内容总是被添加到文章末尾
- 即使 timeline 节点在中间位置,新内容也不会插入到正确的位置

**根本原因**:

在 `insertContentAtTimelinePosition` 函数中,查找前一个节点的结束标记时使用了错误的标记格式:

```typescript
// ❌ 错误的标记格式
const prevEndMarker = `<!-- /TIMELINE_NODE:${prevNode.id} -->`;
```

实际的标记格式是:
```typescript
// ✅ 正确的标记格式
const prevEndMarker = `<!-- /TIMELINE_NODE -->`;  // 不包含 ID
```

由于找不到正确的标记,代码会降级到"追加到末尾"的逻辑。

**影响**:
- 文章结构混乱
- timeline 节点顺序与实际内容不对应
- 用户需要手动调整内容位置

## 解决方案

### 解决方案 1: 传递当前编辑器内容

#### 修改 1: 更新函数签名

在 `page.tsx` 中,修改 `handleRegenerateTimelineContent` 函数,添加 `currentContent` 参数:

```typescript
const handleRegenerateTimelineContent = async (
  timelineItem: ChapterTimelineItem, 
  index: number, 
  currentContent?: string  // 新增参数
) => {
  // ...
  const requestData = {
    currentContent: currentContent || chapter.content || '',  // 优先使用传入的内容
    // ...
  };
};
```

#### 修改 2: 在 WritingModalWrapper 中包装回调

```typescript
// 包装onRegenerateTimelineContent,传递当前编辑器中的内容
const handleRegenerateWithCurrentContent = (
  timelineItem: ChapterTimelineItem, 
  index: number
) => {
  // 传递当前编辑器中的内容
  onRegenerateTimelineContent(timelineItem, index, text);
};

// 在 WritingModal 中使用包装后的函数
<WritingModal
  // ...
  onRegenerateTimelineContent={handleRegenerateWithCurrentContent}
/>
```

**工作流程**:
1. 用户在编辑器中修改内容,`text` 状态实时更新
2. 用户点击 timeline 节点的"重新生成"按钮
3. `handleRegenerateWithCurrentContent` 被调用,传递当前的 `text`
4. API 使用最新的编辑器内容生成新内容
5. 用户的修改不会丢失

### 解决方案 2: 修复内容插入位置

#### 修改 1: 添加内容替换逻辑

如果 timeline 节点已经有内容,应该替换而不是插入:

```typescript
// 检查是否已存在该节点的内容
const targetStartMarker = `<!-- TIMELINE_NODE:${targetTimelineId} -->`;
const targetEndMarker = `<!-- /TIMELINE_NODE -->`;
const existingStartPos = currentContent.indexOf(targetStartMarker);

if (existingStartPos !== -1) {
  // 找到了该节点的现有内容,进行替换
  const contentStart = existingStartPos + targetStartMarker.length;
  const existingEndPos = currentContent.indexOf(targetEndMarker, contentStart);
  
  if (existingEndPos !== -1) {
    // 提取新内容(去除标记)
    const newContentWithoutMarkers = newContent
      .replace(targetStartMarker, '')
      .replace(targetEndMarker, '')
      .trim();
    
    // 替换现有内容
    return (
      currentContent.slice(0, contentStart) +
      `\n${newContentWithoutMarkers}\n` +
      currentContent.slice(existingEndPos)
    );
  }
}
```

#### 修改 2: 修正标记查找逻辑

正确查找前一个节点的结束标记:

```typescript
// 正确的结束标记格式(不包含ID)
const prevStartMarker = `<!-- TIMELINE_NODE:${prevNode.id} -->`;
const prevEndMarker = `<!-- /TIMELINE_NODE -->`;

// 查找前一个节点的开始位置
const prevStartPos = currentContent.indexOf(prevStartMarker);

if (prevStartPos !== -1) {
  // 从前一个节点的开始位置之后查找结束标记
  const prevEndPos = currentContent.indexOf(prevEndMarker, prevStartPos);
  
  if (prevEndPos !== -1) {
    // 找到了前一个节点的标记,在其后插入
    const insertPoint = prevEndPos + prevEndMarker.length;
    return (
      currentContent.slice(0, insertPoint) +
      `\n\n${newContent}\n\n` +
      currentContent.slice(insertPoint)
    );
  }
}
```

**关键改进**:
1. 先查找开始标记 `<!-- TIMELINE_NODE:${prevNode.id} -->`
2. 从开始标记位置之后查找结束标记 `<!-- /TIMELINE_NODE -->`
3. 这样可以确保找到的是正确的结束标记,而不是其他节点的结束标记

## 测试建议

### 测试场景 1: 编辑后重新生成

1. 打开一个章节,生成初稿
2. 在编辑器中修改一些内容(不要保存)
3. 在 timeline 面板中添加修改建议
4. 点击"重新生成"按钮
5. **预期结果**: 新生成的内容应该基于编辑器中的最新内容,而不是数据库中的旧内容

### 测试场景 2: 中间节点重新生成

1. 创建一个包含 3 个 timeline 节点的章节
2. 为每个节点生成内容
3. 为第 2 个节点添加修改建议并重新生成
4. **预期结果**: 新内容应该替换第 2 个节点的原有内容,而不是添加到末尾

### 测试场景 3: 首次生成节点内容

1. 创建一个包含 3 个 timeline 节点的章节
2. 只为第 1 个节点生成内容
3. 为第 2 个节点生成内容
4. **预期结果**: 第 2 个节点的内容应该插入到第 1 个节点之后,而不是末尾

### 测试场景 4: 手动编辑后的降级处理

1. 生成包含 timeline 标记的内容
2. 手动删除所有 timeline 标记
3. 尝试重新生成某个节点
4. **预期结果**: 由于找不到标记,内容应该追加到末尾(降级行为)

## 技术细节

### Timeline 标记格式

```html
<!-- TIMELINE_NODE:timeline-123456 -->
这里是该 timeline 节点对应的内容...
可以有多个段落。
<!-- /TIMELINE_NODE -->
```

**注意**:
- 开始标记包含节点 ID: `<!-- TIMELINE_NODE:${id} -->`
- 结束标记不包含 ID: `<!-- /TIMELINE_NODE -->`
- 这种设计允许嵌套和更灵活的内容组织

### 内容流转

```
用户编辑 → text 状态 → handleRegenerateWithCurrentContent
                ↓
        传递给 handleRegenerateTimelineContent
                ↓
        发送到 API (带当前内容)
                ↓
        生成新内容 (基于最新内容)
                ↓
        insertContentAtTimelinePosition
                ↓
        更新数据库 → 重新加载 → 更新编辑器
```

### 边界情况处理

1. **空内容**: 如果当前内容为空,直接返回新内容
2. **第一个节点**: 插入到开头
3. **找不到前一个节点**: 追加到末尾
4. **找不到标记**: 追加到末尾(降级处理)
5. **节点已存在**: 替换现有内容而不是插入

## 相关文件

- `saas-starter-base/src/lib/novel/content-utils.ts` - 内容处理工具函数
- `saas-starter-base/src/app/[locale]/novel/writing/[chapterId]/page.tsx` - 页面逻辑和回调函数
- `saas-starter-base/src/app/api/novel/regenerate-timeline-content/route.ts` - API 路由

## Git 提交

```bash
git commit -m "fix: 修复Timeline重新生成内容的两个关键问题

问题1: 使用当前编辑器内容而非数据库版本
- 修改handleRegenerateTimelineContent接受currentContent参数
- 在WritingModalWrapper中包装回调,传递当前编辑的text
- 确保重新生成时使用用户最新的编辑内容

问题2: 修复内容插入位置错误
- 修正insertContentAtTimelinePosition函数的标记查找逻辑
- 正确的结束标记格式是<!-- /TIMELINE_NODE -->(不含ID)
- 添加内容替换逻辑:如果节点已存在则替换,否则插入
- 改进标记查找:先找开始标记,再从该位置查找结束标记
- 确保新内容插入到正确的timeline位置而非末尾"
```

## 后续优化建议

1. **实时保存**: 考虑在重新生成前自动保存当前内容
2. **版本对比**: 在应用新内容前,显示新旧内容的对比
3. **撤销功能**: 允许用户撤销重新生成的操作
4. **标记可视化**: 在编辑器中可视化显示 timeline 标记的位置
5. **冲突检测**: 如果用户手动编辑了标记区域,给出警告

