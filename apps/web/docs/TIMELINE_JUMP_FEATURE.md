# Timeline跳转功能技术文档

## 功能概述

Timeline跳转功能允许用户点击Timeline面板中的节点,自动滚动到编辑器中对应的内容位置,并高亮显示该内容。

## 核心技术方案

### 1. HTML标记系统

使用HTML注释标记来标识每个Timeline节点对应的内容位置:

```
<!-- TIMELINE_NODE:timeline-1761305118367-0 -->
[节点对应的内容]
<!-- /TIMELINE_NODE -->
```

**关键特性:**
- 标记对用户不可见(在显示时被清理)
- 标记在数据库中保留(用于跳转定位)
- 每个标记包含唯一的Timeline节点ID

### 2. 数据流转流程

```
伪代码:

// ========== 步骤1: 生成初稿时添加标记 ==========
function generateDraft(settings) {
  // 1.1 调用AI生成内容和timeline
  aiResponse = callAI(settings)
  
  // 1.2 如果有timeline,为生成的内容添加标记
  if (aiResponse.timeline.length > 0) {
    markedContent = addTimelineMarkersToContent(
      aiResponse.content,
      aiResponse.timeline
    )
  } else {
    markedContent = aiResponse.content
  }
  
  // 1.3 返回带标记的内容
  return {
    content: markedContent,
    timeline: aiResponse.timeline
  }
}

// ========== 步骤2: 添加标记的具体实现 ==========
function addTimelineMarkersToContent(content, timeline) {
  // 2.1 将内容按段落分割
  paragraphs = content.split('\n\n')
  
  // 2.2 计算每个timeline节点应该包含多少段落
  segmentSize = Math.ceil(paragraphs.length / timeline.length)
  
  // 2.3 为每个timeline节点包裹标记
  markedSegments = []
  for (i = 0; i < timeline.length; i++) {
    // 获取该节点对应的段落
    startIdx = i * segmentSize
    endIdx = Math.min((i + 1) * segmentSize, paragraphs.length)
    segmentParagraphs = paragraphs[startIdx:endIdx]
    
    // 包裹标记
    markedSegment = `<!-- TIMELINE_NODE:${timeline[i].id} -->
${segmentParagraphs.join('\n\n')}
<!-- /TIMELINE_NODE -->`
    
    markedSegments.push(markedSegment)
  }
  
  // 2.4 合并所有段落
  return markedSegments.join('\n\n')
}

// ========== 步骤3: 保存到数据库 ==========
function saveChapter(chapterId, data) {
  // 3.1 保存带标记的内容到数据库
  database.update(chapterId, {
    content: data.content,  // 包含HTML标记
    timeline: data.timeline
  })
}

// ========== 步骤4: 加载章节并传递给WritingModal ==========
function ChapterWritingPage() {
  // 4.1 从数据库加载章节
  chapter = loadChapterFromDatabase(chapterId)
  
  // 4.2 传递原始内容(带标记)给WritingModal
  return (
    <WritingModal
      initialText={chapter.content}  // 原始内容,包含标记
      timeline={chapter.timeline}
    />
  )
}

// ========== 步骤5: WritingModal内部处理 ==========
function WritingModal({ initialText, timeline }) {
  // 5.1 清理标记用于显示
  displayText = cleanContentForDisplay(initialText)
  
  // 5.2 设置state
  [text, setText] = useState(displayText)
  
  // 5.3 监听跳转事件
  useEffect(() => {
    window.addEventListener('jump-to-timeline-content', handleJumpToContent)
    
    return () => {
      window.removeEventListener('jump-to-timeline-content', handleJumpToContent)
    }
  }, [initialText])  // 依赖initialText(原始内容)
  
  // 5.4 渲染
  return (
    <textarea value={text} />  // 显示清理后的内容
  )
}

// ========== 步骤6: 清理标记函数 ==========
function cleanContentForDisplay(content) {
  // 6.1 移除开始标记
  cleaned = content.replace(/<!-- TIMELINE_NODE:.*? -->\n?/g, '')
  
  // 6.2 移除结束标记
  cleaned = cleaned.replace(/\n?<!-- \/TIMELINE_NODE -->/g, '')
  
  // 6.3 返回清理后的内容
  return cleaned.trim()
}

// ========== 步骤7: 用户点击Timeline节点 ==========
function TimelinePanel({ timeline, onJumpToTimelineContent }) {
  return timeline.map(item => (
    <div>
      <span onClick={() => onJumpToTimelineContent(item.id)}>
        {item.content}
      </span>
    </div>
  ))
}

// ========== 步骤8: 触发跳转事件 ==========
function handleJumpToTimelineContent(timelineItemId) {
  // 8.1 创建自定义事件
  event = new CustomEvent('jump-to-timeline-content', {
    detail: { timelineItemId }
  })
  
  // 8.2 分发事件
  window.dispatchEvent(event)
}

// ========== 步骤9: 处理跳转逻辑 ==========
function handleJumpToContent(event) {
  timelineItemId = event.detail.timelineItemId
  
  // 9.1 在原始内容(带标记)中查找标记位置
  marker = `<!-- TIMELINE_NODE:${timelineItemId} -->`
  markerIndex = initialText.indexOf(marker)
  
  // 9.2 如果找不到标记,提示用户
  if (markerIndex === -1) {
    alert('该时间线节点还没有生成对应的内容')
    return
  }
  
  // 9.3 计算标记之前有多少行
  textBeforeMarker = initialText.substring(0, markerIndex)
  linesBefore = textBeforeMarker.split('\n').length
  
  // 9.4 获取textarea的行高
  lineHeight = parseInt(getComputedStyle(textarea).lineHeight)
  
  // 9.5 计算滚动位置
  scrollTop = Math.max(0, (linesBefore - 5) * lineHeight)
  
  // 9.6 滚动到对应位置
  textarea.scrollTop = scrollTop
  
  // 9.7 计算选中范围(在清理后的text中)
  endMarker = '<!-- /TIMELINE_NODE -->'
  endMarkerIndex = initialText.indexOf(endMarker, markerIndex)
  
  if (endMarkerIndex !== -1) {
    // 9.7.1 计算标记之前有多少个标记
    textBeforeMarkerInOriginal = initialText.substring(0, markerIndex)
    markersBefore = countMatches(textBeforeMarkerInOriginal, /<!-- TIMELINE_NODE:.*? -->/g)
    endMarkersBefore = countMatches(textBeforeMarkerInOriginal, /<!-- \/TIMELINE_NODE -->/g)
    
    // 9.7.2 计算清理后的起始位置
    cleanedStartPos = markerIndex - markersBefore * marker.length - endMarkersBefore * endMarker.length
    
    // 9.7.3 计算内容长度
    contentWithMarkers = initialText.substring(markerIndex + marker.length, endMarkerIndex)
    contentLength = contentWithMarkers.length
    
    // 9.7.4 选中内容
    textarea.focus()
    textarea.setSelectionRange(cleanedStartPos, cleanedStartPos + contentLength)
    
    // 9.7.5 1秒后取消选中
    setTimeout(() => {
      textarea.setSelectionRange(cleanedStartPos, cleanedStartPos)
    }, 1000)
  }
}
```

## 关键设计决策

### 1. 为什么使用HTML注释标记?

- **不可见性**: HTML注释在文本编辑器中不会被渲染,对用户透明
- **唯一性**: 每个标记包含Timeline节点的唯一ID
- **可靠性**: 标记不会被用户误删(因为不可见)
- **兼容性**: 即使用户手动编辑内容,标记也不会影响阅读

### 2. 为什么在WritingModal内部清理标记?

- **数据一致性**: 数据库中保留原始标记,确保跳转功能始终可用
- **显示清洁**: 用户看到的是清理后的内容,没有标记干扰
- **单一职责**: WritingModal负责显示逻辑,page.tsx负责数据逻辑

### 3. 为什么使用CustomEvent?

- **解耦**: TimelinePanel和WritingModal不需要直接通信
- **灵活性**: 可以在任何地方触发跳转事件
- **可扩展**: 未来可以添加更多事件监听器

## 常见问题

### Q1: 如果用户手动编辑了内容,标记会丢失吗?

A: 不会。标记只在显示时被清理,保存时会保留原始标记。但如果用户删除了包含标记的段落,该标记会丢失。

### Q2: 如果Timeline节点顺序改变,标记会错乱吗?

A: 不会。每个标记包含Timeline节点的唯一ID,与顺序无关。

### Q3: 如何处理旧内容(没有标记)?

A: 跳转功能会检测标记是否存在,如果不存在会提示用户"该时间线节点还没有生成对应的内容"。

### Q4: 为什么要计算markersBefore和endMarkersBefore?

A: 因为在清理后的text中,标记已经被移除,所以需要计算标记之前有多少个标记,然后减去这些标记的长度,才能得到正确的位置。

## 文件清单

- `src/app/api/novel/generate-draft/route.ts` - 生成初稿时添加标记
- `src/app/[locale]/novel/writing/[chapterId]/page.tsx` - 加载章节并传递原始内容
- `src/components/WritingModal.tsx` - 清理标记、监听跳转事件、处理跳转逻辑
- `src/components/novel/TimelinePanel.tsx` - 触发跳转事件
- `src/lib/novel/content-utils.ts` - 标记处理工具函数

## 测试建议

1. 创建新章节并生成Timeline和初稿
2. 验证数据库中的内容包含HTML标记
3. 验证WritingModal中显示的内容不包含标记
4. 点击Timeline节点,验证编辑器滚动到正确位置
5. 验证内容被正确选中并高亮1秒
6. 测试多个Timeline节点的跳转功能
7. 测试没有生成内容的Timeline节点(应该提示用户)

