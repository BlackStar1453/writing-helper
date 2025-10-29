# Writing Assistant Feature - 需求文档

## 1. 功能概述

在现有的HarperEditor中扩展Agent功能,允许用户通过Agent对话触发写作模式,在写作完成后将内容和Harper检测到的错误一起发送给Agent进行分析和优化建议。

## 2. 用户流程

```
用户在HarperEditor中与Agent对话
    ↓
Agent回复包含"开始写作"选项
    ↓
用户点击"开始写作"
    ↓
打开WritingModal(写作模态窗口)
    ↓
用户在左侧输入框中写作
    ↓
Harper实时检测并在右侧显示错误和建议
    ↓
用户点击"提交"按钮
    ↓
WritingModal关闭
    ↓
将"用户写作内容 + Harper错误信息"发送到Agent对话
    ↓
Agent分析并提供: 错误解释 + 优化建议 + 改写示例
```

## 3. 核心组件设计

### 3.1 AgentModal 扩展

**现有功能:**
- 显示对话消息
- 接收用户输入
- 发送消息到Agent

**新增功能:**
- 解析Agent回复中的"开始写作"选项
- 显示可点击的选项按钮
- 点击后打开WritingModal
- 接收WritingModal提交的数据并发送给Agent

**伪代码:**
```typescript
// AgentModal.tsx
interface AgentModalProps {
  // ... 现有props
}

function AgentModal(props) {
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false)
  
  // 解析消息中的选项
  function parseMessageOptions(content: string): string[] {
    // 检测特定格式,如: [OPTION:开始写作]
    // 返回选项数组
  }
  
  // 处理选项点击
  function handleOptionClick(option: string) {
    if (option === "开始写作") {
      setIsWritingModalOpen(true)
    }
  }
  
  // 接收写作内容
  function handleWritingSubmit(data: WritingData) {
    const message = formatWritingMessage(data)
    sendMessage({ text: message })
    setIsWritingModalOpen(false)
  }
  
  return (
    <>
      {/* 现有对话界面 */}
      {/* 显示选项按钮 */}
      
      <WritingModal
        isOpen={isWritingModalOpen}
        onClose={() => setIsWritingModalOpen(false)}
        onSubmit={handleWritingSubmit}
      />
    </>
  )
}
```

### 3.2 WritingModal 组件(新建)

**功能:**
- 左右分栏布局
- 左侧: 文本输入区域
- 右侧: Harper suggestions面板
- 实时语法检查
- 提交按钮

**伪代码:**
```typescript
// WritingModal.tsx
interface WritingData {
  userText: string
  errors: ErrorInfo[]
}

interface WritingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: WritingData) => void
}

function WritingModal({ isOpen, onClose, onSubmit }: WritingModalProps) {
  const [text, setText] = useState('')
  const [lints, setLints] = useState<HarperLint[]>([])
  const linterRef = useRef<any>(null)
  
  // 初始化Harper
  useEffect(() => {
    if (isOpen) {
      initHarper()
    }
  }, [isOpen])
  
  // 实时检测
  useEffect(() => {
    if (text && linterRef.current) {
      lintText()
    }
  }, [text])
  
  // 提交处理
  function handleSubmit() {
    const errors = getErrorsInfo()
    onSubmit({ userText: text, errors })
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex h-full">
        {/* 左侧: 输入区域 (70%) */}
        <div className="w-[70%]">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start writing..."
          />
        </div>
        
        {/* 右侧: Suggestions (30%) */}
        <div className="w-[30%]">
          <SuggestionsList lints={lints} onApply={applySuggestion} />
        </div>
      </div>
      
      <div className="actions">
        <button onClick={onClose}>取消</button>
        <button onClick={handleSubmit}>提交</button>
      </div>
    </Modal>
  )
}
```

### 3.3 Agent System Prompt 修改

**现有System Prompt位置:**
`saas-starter-base/src/app/api/chat/route.ts`

**修改内容:**
```typescript
const systemMessage = {
  role: 'system',
  content: `You are an AI writing assistant...

When appropriate, you can offer the user to start writing by including this option in your response:
[OPTION:开始写作]

When the user submits their writing, you will receive:
1. The user's written text
2. Grammar and spelling errors detected by Harper
3. Suggestions for each error

Your task is to:
- Explain each error in detail
- Provide optimization suggestions
- Offer rewritten examples with better expressions
`
}
```

### 3.4 数据格式设计

**WritingData 接口:**
```typescript
interface WritingData {
  userText: string
  errors: ErrorInfo[]
}

interface ErrorInfo {
  type: string
  typePretty: string
  message: string
  problemText: string
  position: { start: number; end: number }
  suggestions: Array<{
    kind: number
    replacementText: string
  }>
}
```

**发送给Agent的消息格式(混合格式):**
```
我完成了写作,请帮我分析和优化:

【我的写作内容】
{userText}

【Harper检测到的问题】
共发现 {errors.length} 个问题:

1. 错误类型: {error.typePretty}
   问题文本: "{error.problemText}"
   位置: 第{line}行
   说明: {error.message}
   建议: {error.suggestions.map(s => s.replacementText).join(', ')}

2. ...

请帮我:
1. 解释每个错误的原因
2. 提供优化建议
3. 给出改写示例
```

## 4. 文件修改清单

### 需要修改的文件:
1. `saas-starter-base/src/components/AgentModal.tsx`
   - 添加选项解析逻辑
   - 添加WritingModal状态管理
   - 添加选项按钮渲染
   - 添加写作数据处理

2. `saas-starter-base/src/app/api/chat/route.ts`
   - 修改system prompt

### 需要创建的文件:
1. `saas-starter-base/src/components/WritingModal.tsx`
   - 新建写作模态窗口组件
   - 集成Harper检测
   - 实现左右分栏布局

2. `saas-starter-base/src/lib/writing-utils.ts`
   - 选项解析工具函数
   - 消息格式化工具函数

## 5. 技术要点

### 5.1 Harper集成
- 复用HarperEditor中的Harper初始化逻辑
- 使用WorkerLinter进行实时检测
- 配置与HarperEditor相同的lint规则

### 5.2 选项解析
- 使用正则表达式匹配 `[OPTION:xxx]` 格式
- 支持多个选项同时存在
- 选项按钮样式与现有UI保持一致

### 5.3 消息格式化
- 将结构化数据转换为易读的文本格式
- 保留JSON数据供Agent解析
- 使用Markdown格式增强可读性

### 5.4 状态管理
- WritingModal独立管理自己的text和lints状态
- 通过onSubmit回调传递数据给AgentModal
- 关闭时清空状态

## 6. 用户体验考虑

### 6.1 交互反馈
- 点击"开始写作"时显示加载动画
- WritingModal打开时有平滑过渡动画
- 提交时显示处理中状态

### 6.2 错误处理
- Harper初始化失败时显示友好提示
- 提交空内容时给出提示
- 网络错误时允许重试

### 6.3 响应式设计
- 在小屏幕上调整左右分栏比例
- 移动端考虑上下布局

## 7. 后续扩展(暂不实现)

- 保存写作历史
- 支持多轮写作修改
- 导出写作内容
- 自定义Harper检测规则

