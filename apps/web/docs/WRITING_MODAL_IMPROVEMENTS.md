# WritingModal 和 Timeline 功能改进

## 概述

本次更新对 WritingModal 和 Timeline 功能进行了三个主要改进,提升了用户体验和内容创作效率。

## 改进内容

### 1. 增大时间线输入框

**问题**: 时间线编辑时的输入框太小(只有2行),不便于编辑较长的内容。

**解决方案**:
- 将 textarea 的 `rows` 从 2 增加到 4
- 增加 padding 使其更易于阅读和编辑
- 添加 placeholder 提示文本

**修改文件**: `saas-starter-base/src/components/novel/GenerateDraftSettingsModal.tsx`

**代码变更**:
```tsx
<textarea
  value={editingTimelineContent}
  onChange={(e) => setEditingTimelineContent(e.target.value)}
  className="flex-1 p-2 text-sm border rounded resize-none"
  rows={4}  // 从 2 增加到 4
  placeholder="描述这个时间线节点的内容..."
/>
```

### 2. 为 Timeline 添加目标字数设置

**问题**: 生成初稿时无法控制每个时间线节点的详细程度,导致重点内容可能过于简略,次要内容可能过于冗长。

**解决方案**:
- 在 `ChapterTimelineItem` 类型中添加 `targetWordCount` 字段
- 在编辑时间线时提供字数选择下拉菜单
- 在非编辑状态显示字数标签
- 提供4个预设选项:简短(200字)、中等(500字)、详细(800字)、很详细(1200字)

**修改文件**:
1. `saas-starter-base/src/lib/novel/types.ts` - 类型定义
2. `saas-starter-base/src/components/novel/GenerateDraftSettingsModal.tsx` - UI实现

**类型定义**:
```typescript
export interface ChapterTimelineItem {
  id: string;
  order: number;
  content: string;
  modificationSuggestion?: string;
  isReviewed?: boolean;
  targetWordCount?: number; // 新增: 目标字数
}
```

**UI实现**:
```tsx
{/* 编辑状态 - 字数选择 */}
<select
  value={item.targetWordCount || 500}
  onChange={(e) => {
    const newTimeline = timeline.map(t =>
      t.id === item.id
        ? { ...t, targetWordCount: parseInt(e.target.value) }
        : t
    );
    setTimeline(newTimeline);
  }}
  className="text-xs border rounded px-2 py-1"
>
  <option value="200">简短 (200字)</option>
  <option value="500">中等 (500字)</option>
  <option value="800">详细 (800字)</option>
  <option value="1200">很详细 (1200字)</option>
</select>

{/* 非编辑状态 - 字数标签 */}
{item.targetWordCount && (
  <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
    ~{item.targetWordCount}字
  </span>
)}
```

### 3. 优化自动保存逻辑

**问题**: 之前没有自动保存机制,用户可能因为忘记保存或意外关闭而丢失内容。

**解决方案**:
- 实现防抖自动保存: 用户停止输入1.5秒后自动保存
- 实现失焦自动保存: 离开编辑器时立即保存
- 添加保存状态指示器: 显示"保存中"、"已保存"状态
- "已保存"状态在2秒后自动隐藏

**修改文件**: `saas-starter-base/src/components/WritingModal.tsx`

**实现细节**:

#### 状态管理
```typescript
const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
```

#### 自动保存函数
```typescript
const autoSave = (content: string) => {
  if (!onSaveWritingHistory || !content.trim()) return;
  
  setSaveStatus('saving');
  try {
    onSaveWritingHistory(content);
    setSaveStatus('saved');
    // 2秒后隐藏"已保存"状态
    setTimeout(() => {
      setSaveStatus('unsaved');
    }, 2000);
  } catch (error) {
    console.error('Auto save failed:', error);
    setSaveStatus('unsaved');
  }
};
```

#### 防抖自动保存
```typescript
useEffect(() => {
  if (!text.trim()) return;

  // 清除之前的定时器
  if (autoSaveTimerRef.current) {
    clearTimeout(autoSaveTimerRef.current);
  }

  // 设置新的定时器
  autoSaveTimerRef.current = setTimeout(() => {
    autoSave(text);
  }, 1500); // 1.5秒后自动保存

  // 清理函数
  return () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  };
}, [text, onSaveWritingHistory]);
```

#### 失焦保存
```tsx
<textarea
  value={text}
  onChange={(e) => {
    const newText = e.target.value;
    setText(newText);
    setSaveStatus('unsaved'); // 标记为未保存
  }}
  onBlur={() => {
    // 失焦时立即保存
    if (text.trim() && onSaveWritingHistory) {
      autoSave(text);
    }
  }}
  // ... 其他属性
/>
```

#### 保存状态指示器
```tsx
{/* 保存中 */}
{saveStatus === 'saving' && (
  <span className="text-xs text-gray-500 flex items-center gap-1">
    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
    保存中...
  </span>
)}

{/* 已保存 */}
{saveStatus === 'saved' && (
  <span className="text-xs text-green-600 flex items-center gap-1">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
    已保存
  </span>
)}
```

## 技术细节

### 最小侵入原则

所有修改都遵循最小侵入原则:
- 类型定义使用可选字段 (`targetWordCount?`)
- 保持向后兼容,不影响现有功能
- 自动保存不干扰用户正常编辑

### 性能优化

- 使用防抖(debounce)避免频繁保存
- 使用 `useRef` 存储定时器,避免不必要的重渲染
- 保存状态自动隐藏,减少视觉干扰

### 用户体验

- 清晰的视觉反馈(保存中/已保存)
- 合理的时间设置(1.5秒防抖,2秒状态隐藏)
- 失焦立即保存,防止意外丢失

## 使用说明

### 设置时间线字数

1. 在生成初稿设置中点击"生成Timeline"
2. 点击时间线节点的编辑按钮
3. 在"目标字数"下拉菜单中选择合适的字数
4. 点击"保存"按钮

### 查看字数标签

在非编辑状态下,每个时间线节点会显示字数标签,例如 `~500字`

### 自动保存

- 编辑内容后,停止输入1.5秒会自动保存
- 点击编辑器外部(失焦)会立即保存
- 保存状态会显示在编辑器标题旁边

## 后续优化建议

1. **字数统计**: 在生成内容后,显示实际字数与目标字数的对比
2. **自定义字数**: 允许用户输入自定义的目标字数
3. **保存历史**: 记录每次自动保存的时间点,支持回退
4. **离线保存**: 使用 IndexedDB 实现离线保存功能

## 测试建议

1. 测试时间线编辑功能,确认输入框大小合适
2. 测试字数设置功能,确认选项正确保存
3. 测试自动保存功能:
   - 输入内容后等待1.5秒,确认自动保存
   - 点击编辑器外部,确认立即保存
   - 观察保存状态指示器是否正确显示
4. 测试边界情况:
   - 空内容不应触发保存
   - 快速连续输入应只保存一次
   - 失焦时应立即保存,不等待防抖

## 相关文件

- `saas-starter-base/src/lib/novel/types.ts` - 类型定义
- `saas-starter-base/src/components/novel/GenerateDraftSettingsModal.tsx` - Timeline设置UI
- `saas-starter-base/src/components/WritingModal.tsx` - 写作编辑器和自动保存

## Git 提交

```bash
git commit -m "feat: 完善WritingModal和Timeline功能

- 增大时间线输入框(从2行增加到4行)
- 为Timeline添加目标字数设置(200/500/800/1200字)
- 在非编辑状态显示字数标签
- 添加防抖自动保存(1.5秒后自动保存)
- 添加失焦自动保存(离开编辑器时立即保存)
- 添加保存状态指示器(保存中/已保存)
- 更新ChapterTimelineItem类型定义,添加targetWordCount字段"
```

