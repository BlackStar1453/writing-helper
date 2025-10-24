# Writing Assistant Feature - 实现文档

## 1. 实现策略

采用**最小侵入原则**,优先复用现有代码,避免重复实现。

### 核心原则:
1. 复用HarperEditor的Harper初始化和检测逻辑
2. 复用AgentModal的样式和布局模式
3. 使用简单的字符串匹配解析选项(避免复杂的解析器)
4. 最小化状态管理复杂度

## 2. 实现步骤

### Step 1: 创建工具函数 (writing-utils.ts)

**目的:** 提供选项解析和消息格式化功能

**伪代码:**
```typescript
// src/lib/writing-utils.ts

// 解析消息中的选项
export function parseMessageOptions(content: string): string[] {
  const optionRegex = /\[OPTION:([^\]]+)\]/g
  const options: string[] = []
  let match
  
  while ((match = optionRegex.exec(content)) !== null) {
    options.push(match[1])
  }
  
  return options
}

// 移除消息中的选项标记
export function removeOptionTags(content: string): string {
  return content.replace(/\[OPTION:([^\]]+)\]/g, '')
}

// 格式化写作数据为消息
export function formatWritingMessage(data: WritingData): string {
  const { userText, errors } = data
  
  let message = `我完成了写作,请帮我分析和优化:\n\n`
  message += `【我的写作内容】\n${userText}\n\n`
  
  if (errors.length > 0) {
    message += `【Harper检测到的问题】\n`
    message += `共发现 ${errors.length} 个问题:\n\n`
    
    errors.forEach((error, index) => {
      const line = calculateLineNumber(userText, error.position.start)
      message += `${index + 1}. 错误类型: ${error.typePretty}\n`
      message += `   问题文本: "${error.problemText}"\n`
      message += `   位置: 第${line}行\n`
      message += `   说明: ${error.message}\n`
      
      if (error.suggestions.length > 0) {
        const suggestionTexts = error.suggestions
          .map(s => s.replacementText)
          .filter(t => t)
          .join(', ')
        if (suggestionTexts) {
          message += `   建议: ${suggestionTexts}\n`
        }
      }
      message += `\n`
    })
  } else {
    message += `【Harper检测结果】\n未发现语法或拼写错误。\n\n`
  }
  
  message += `请帮我:\n`
  message += `1. 解释每个错误的原因\n`
  message += `2. 提供优化建议\n`
  message += `3. 给出改写示例\n`
  
  return message
}

// 计算行号
function calculateLineNumber(text: string, position: number): number {
  return text.substring(0, position).split('\n').length
}

// 类型定义
export interface WritingData {
  userText: string
  errors: ErrorInfo[]
}

export interface ErrorInfo {
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

### Step 2: 创建WritingModal组件

**目的:** 提供写作界面,集成Harper检测

**伪代码:**
```typescript
// src/components/WritingModal.tsx

import { useEffect, useRef, useState } from 'react'
import type { Lint as HarperLint } from 'harper.js'
import { WritingData, ErrorInfo } from '@/lib/writing-utils'

interface WritingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: WritingData) => void
}

export function WritingModal({ isOpen, onClose, onSubmit }: WritingModalProps) {
  const [text, setText] = useState('')
  const [lints, setLints] = useState<HarperLint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const linterRef = useRef<any>(null)
  
  // 初始化Harper (复用HarperEditor逻辑)
  useEffect(() => {
    if (!isOpen) return
    
    let mounted = true
    
    async function initHarper() {
      try {
        const harper = await import('harper.js')
        if (!mounted) return
        
        linterRef.current = new harper.WorkerLinter({
          binary: harper.binaryInlined,
          dialect: harper.Dialect.American,
        })
        
        await linterRef.current.setup()
        
        // 设置默认配置
        const defaultCfg = await linterRef.current.getDefaultLintConfig()
        defaultCfg.SpellCheck = true
        defaultCfg.AnA = true
        defaultCfg.SentenceCapitalization = true
        await linterRef.current.setLintConfig(defaultCfg)
        
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to initialize Harper:', error)
        setIsLoading(false)
      }
    }
    
    initHarper()
    
    return () => {
      mounted = false
    }
  }, [isOpen])
  
  // 实时检测 (复用HarperEditor逻辑)
  useEffect(() => {
    if (isLoading || !linterRef.current || !text) {
      setLints([])
      return
    }
    
    const lintText = async () => {
      try {
        const results = await linterRef.current.lint(text, { language: 'plaintext' })
        setLints(results)
      } catch (error) {
        console.error('Linting error:', error)
      }
    }
    
    const timeoutId = setTimeout(lintText, 300)
    return () => clearTimeout(timeoutId)
  }, [text, isLoading])
  
  // 获取错误信息
  const getErrorsInfo = (): ErrorInfo[] => {
    return lints.map(lint => {
      const span = lint.span()
      const suggestions = lint.suggestions()
      
      return {
        type: lint.lint_kind(),
        typePretty: lint.lint_kind_pretty(),
        message: lint.message(),
        messageHtml: lint.message_html(),
        problemText: lint.get_problem_text(),
        position: { start: span.start, end: span.end },
        suggestions: suggestions.map(s => ({
          kind: s.kind(),
          replacementText: s.get_replacement_text()
        })),
        json: lint.to_json()
      }
    })
  }
  
  // 应用建议
  const applySuggestion = (lint: HarperLint, suggestionIndex: number) => {
    const span = lint.span()
    const suggestion = lint.suggestions()[suggestionIndex]
    const replacement = suggestion.get_replacement_text()
    
    const before = text.substring(0, span.start)
    const after = text.substring(span.end)
    
    if (suggestion.kind() === 1) {
      setText(before + after)
    } else {
      setText(before + replacement + after)
    }
  }
  
  // 提交处理
  const handleSubmit = () => {
    if (!text.trim()) {
      alert('请输入内容后再提交')
      return
    }
    
    const errors = getErrorsInfo()
    onSubmit({ userText: text, errors })
    
    // 清空状态
    setText('')
    setLints([])
  }
  
  // 关闭处理
  const handleClose = () => {
    setText('')
    setLints([])
    onClose()
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      {/* Modal */}
      <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">开始写作</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Editor (70%) */}
          <div className="w-[70%] p-4 border-r border-gray-200 dark:border-gray-700">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start writing here..."
              className="w-full h-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          
          {/* Right: Suggestions (30%) */}
          <div className="w-[30%] p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">
              Suggestions ({lints.length})
            </h3>
            
            {isLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : lints.length === 0 ? (
              <div className="text-gray-500">No issues found</div>
            ) : (
              <div className="space-y-3">
                {lints.map((lint, index) => {
                  const span = lint.span()
                  const errorText = text.substring(span.start, span.end)
                  
                  return (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                        {lint.lint_kind_pretty()}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        "{errorText}"
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {lint.message()}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: lint.suggestion_count() }).map((_, sugIndex) => {
                          const suggestion = lint.suggestions()[sugIndex]
                          const replacement = suggestion.get_replacement_text()
                          
                          return (
                            <button
                              key={sugIndex}
                              onClick={() => applySuggestion(lint, sugIndex)}
                              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
                            >
                              {replacement || 'Remove'}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交分析
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Step 3: 修改AgentModal组件

**目的:** 添加选项解析和WritingModal集成

**参考:** cunzhi项目中的PopupInput.vue组件实现了类似的选项处理逻辑

**伪代码:**
```typescript
// src/components/AgentModal.tsx

// 在文件顶部添加导入
import { WritingModal } from './WritingModal'
import { parseMessageOptions, removeOptionTags, formatWritingMessage, WritingData } from '@/lib/writing-utils'

// 在组件内部添加状态
const [isWritingModalOpen, setIsWritingModalOpen] = useState(false)
const [selectedOptions, setSelectedOptions] = useState<string[]>([])

// 添加处理函数
const handleWritingSubmit = async (data: WritingData) => {
  const message = formatWritingMessage(data)
  setIsWritingModalOpen(false)

  await sendMessage({
    text: message,
  })
}

// 处理选项点击 (参考PopupInput.vue的handleOptionToggle)
const handleOptionClick = (option: string) => {
  if (option === '开始写作') {
    setIsWritingModalOpen(true)
  }
  // 可以扩展其他选项的处理
}

// 在渲染消息时解析选项
{messages.map((msg, idx) => {
  let contentText = ''
  if (msg.parts && Array.isArray(msg.parts)) {
    contentText = msg.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('')
  }

  // 解析选项 (只对assistant消息解析)
  const options = msg.role === 'assistant' ? parseMessageOptions(contentText) : []
  const cleanContent = removeOptionTags(contentText)

  return (
    <div key={msg.id ?? idx}>
      <ChatMessage
        role={msg.role as 'user' | 'assistant' | 'system'}
        content={cleanContent}
        isStreaming={isLoading && idx === messages.length - 1 && msg.role === 'assistant'}
      />

      {/* 显示选项按钮 (参考PopupInput.vue的选项渲染) */}
      {options.length > 0 && !isLoading && (
        <div className="flex flex-wrap gap-2 mt-2 px-4">
          {options.map((option, optIdx) => (
            <button
              key={optIdx}
              onClick={() => handleOptionClick(option)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})}

// 在组件末尾添加WritingModal
<WritingModal
  isOpen={isWritingModalOpen}
  onClose={() => setIsWritingModalOpen(false)}
  onSubmit={handleWritingSubmit}
/>
```

**关键点:**
1. 选项只在assistant消息中解析
2. 选项按钮只在非加载状态下显示
3. 使用emerald色系与"Ask Agent"按钮保持一致
4. 添加图标增强视觉效果

### Step 4: 修改System Prompt

**目的:** 让Agent知道如何提供"开始写作"选项

**伪代码:**
```typescript
// src/app/api/chat/route.ts

const systemMessage = {
  role: 'system',
  content: `You are an AI writing assistant specialized in helping users improve their English writing.

You have access to Harper grammar checker results and can provide detailed explanations and suggestions.

**Important Instructions:**

1. When a user asks for help with writing or wants to practice writing, you can offer them to start writing by including this option in your response:
   [OPTION:开始写作]

2. When the user submits their writing, you will receive:
   - The user's written text
   - Grammar and spelling errors detected by Harper
   - Suggestions for each error

3. Your task is to:
   - Explain each error in detail and why it's incorrect
   - Provide optimization suggestions for better expression
   - Offer rewritten examples with native-like expressions
   - Be encouraging and supportive

4. Format your response clearly with sections for:
   - Error Analysis
   - Optimization Suggestions
   - Rewritten Examples

Example response with option:
"I'd be happy to help you practice your writing! Would you like to start writing now?
[OPTION:开始写作]"
`
}
```

## 3. 实现顺序

1. **创建 writing-utils.ts** - 独立的工具函数,无依赖
2. **创建 WritingModal.tsx** - 独立组件,可单独测试
3. **修改 AgentModal.tsx** - 集成WritingModal
4. **修改 chat/route.ts** - 更新system prompt

## 4. 测试策略

### 手动测试流程:
1. 启动开发服务器
2. 打开HarperEditor页面
3. 点击任意错误的"Ask Agent"按钮
4. 在Agent对话中输入: "I want to practice writing"
5. 验证Agent回复包含"开始写作"按钮
6. 点击"开始写作"按钮
7. 在WritingModal中输入包含错误的文本
8. 验证右侧显示Harper检测结果
9. 点击"提交分析"
10. 验证Agent收到消息并提供分析

### 关键测试点:
- [ ] 选项解析正确
- [ ] WritingModal正常打开/关闭
- [ ] Harper检测正常工作
- [ ] 建议可以正常应用
- [ ] 提交数据格式正确
- [ ] Agent回复包含错误解释、优化建议和改写示例

## 5. 潜在问题和解决方案

### 问题1: Harper初始化慢
**解决:** 显示加载状态,禁用输入框

### 问题2: 选项标记被Agent错误输出
**解决:** 在system prompt中明确说明格式,并在前端做容错处理

### 问题3: 消息格式过长
**解决:** 只包含必要信息,错误数量过多时截断

### 问题4: WritingModal样式与主题不一致
**解决:** 复用AgentModal的样式类名

## 6. 代码复用清单

从HarperEditor复用:
- Harper初始化逻辑
- Lint配置
- 错误信息提取
- 建议应用逻辑

从AgentModal复用:
- 模态窗口样式
- 按钮样式
- 布局模式

## 7. 文件大小估算

- writing-utils.ts: ~100行
- WritingModal.tsx: ~250行
- AgentModal.tsx修改: +50行
- chat/route.ts修改: +20行

总计: ~420行新代码

