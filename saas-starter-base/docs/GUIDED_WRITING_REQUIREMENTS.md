# 分步写作指导流程 - 需求文档

## 1. 功能概述

实现一个**分步骤的写作指导流程**,Agent引导用户完成5个写作步骤(Introduction → Body1 → Body2 → Body3 → Conclusion),每个步骤都包含:写作 → 评估 → 反馈 → 修改(可选) → 下一步。

## 2. 用户流程

### 2.1 开始写作
```
用户: "I want to practice writing" 或 "帮我写一篇关于XX的作文"
  ↓
Agent: 生成/接收题目 → 分析题目 → 显示第一步指导(Introduction)
  ↓
Agent: 显示 [OPTION:开始写作] 按钮
  ↓
用户: 点击"开始写作"
  ↓
打开WritingModal,显示题目、流程指示器、Tips、编辑器
```

### 2.2 单个步骤流程
```
用户: 在编辑器中写作
  ↓
用户: 点击"提交评估"按钮
  ↓
发送内容给Agent评估
  ↓
Agent: 返回评分 + Native表达建议(AIStructuredSuggestion格式)
  ↓
WritingModal: 显示评分 + "查看反馈"按钮 + "进入下一步"按钮
  ↓
用户: (可选)点击"查看反馈" → 查看Native建议 → 修改
  ↓
用户: 点击"进入下一步"
  ↓
Agent: 返回下一步骤的指导内容
  ↓
WritingModal: 更新流程指示器 + Tips + 清空编辑器(或保留内容?)
```

### 2.3 完成整篇作文
```
用户: 完成Conclusion步骤
  ↓
Agent: 返回整篇作文的总评分 + 完整反馈
  ↓
WritingModal: 显示"完成写作"状态 + 保存按钮
```

## 3. 数据结构设计

### 3.1 Agent传递给WritingModal的参数

#### 开始写作时传递:
```typescript
interface GuidedWritingData {
  topic: string;                    // 题目
  level: 'beginner' | 'intermediate' | 'advanced';  // 难度
  currentStep: WritingStep;         // 当前步骤
  completedSteps: StepResult[];     // 已完成步骤的结果
}

interface WritingStep {
  name: 'introduction' | 'body1' | 'body2' | 'body3' | 'conclusion';
  displayName: string;              // "Introduction", "Body Paragraph 1", etc.
  instruction: string;              // "Write an engaging introduction..."
  tips: string[];                   // ["Start with a hook", "Provide background", ...]
  example?: string;                 // 可选的示例
}

interface StepResult {
  stepName: string;                 // 'introduction', 'body1', etc.
  content: string;                  // 用户写的内容
  score: number;                    // 评分 (0-100)
  feedback: string;                 // 总体反馈
  nativeSuggestions: AIStructuredSuggestion[];  // Native表达建议
}
```

#### Agent评估后返回:
```typescript
interface StepEvaluation {
  score: number;                    // 评分 (0-100)
  feedback: string;                 // 总体反馈
  nativeSuggestions: AIStructuredSuggestion[];  // Native表达建议
  nextStep?: WritingStep;           // 下一步骤(如果不是最后一步)
  isComplete: boolean;              // 是否完成整篇作文
}
```

### 3.2 AIStructuredSuggestion格式(复用现有)
```typescript
interface AIStructuredSuggestion {
  start: number;                    // 起始位置
  end: number;                      // 结束位置
  type: 'native-expression' | 'word-choice' | 'sentence-structure';
  message: string;                  // 建议说明
  problemText: string;              // 原文本
  replacements: string[];           // 建议替换
}
```

## 4. UI设计

### 4.1 WritingModal布局

```
┌─────────────────────────────────────────────────────────────┐
│  Writing Assistant - Guided Mode                      [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  LEFT PANEL         │  │  RIGHT PANEL                │  │
│  │                     │  │                             │  │
│  │  📝 Topic:          │  │  Tabs:                      │  │
│  │  "The Impact of..." │  │  - Harper Suggestions       │  │
│  │                     │  │  - AI Suggestions           │  │
│  │  ━━━━━━━━━━━━━━━━━  │  │  - Chat                     │  │
│  │  Progress:          │  │                             │  │
│  │  ✅ Introduction    │  │  (现有功能保留)              │  │
│  │     (85/100)        │  │                             │  │
│  │  🔵 Body Para 1     │  │                             │  │
│  │     (Current)       │  │                             │  │
│  │  ⚪ Body Para 2     │  │                             │  │
│  │  ⚪ Body Para 3     │  │                             │  │
│  │  ⚪ Conclusion      │  │                             │  │
│  │                     │  │                             │  │
│  │  ━━━━━━━━━━━━━━━━━  │  │                             │  │
│  │  💡 Tips:           │  │                             │  │
│  │  (可折叠区域)        │  │                             │  │
│  │  - Start with hook  │  │                             │  │
│  │  - Provide context  │  │                             │  │
│  │  - State thesis     │  │                             │  │
│  │                     │  │                             │  │
│  │  ━━━━━━━━━━━━━━━━━  │  │                             │  │
│  │  Editor:            │  │                             │  │
│  │  ┌─────────────────┐│  │                             │  │
│  │  │                 ││  │                             │  │
│  │  │  [Writing...]   ││  │                             │  │
│  │  │                 ││  │                             │  │
│  │  └─────────────────┘│  │                             │  │
│  │                     │  │                             │  │
│  │  [Submit] [Next]    │  │                             │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 流程指示器状态

- ✅ 绿色勾 + 评分: 已完成步骤
- 🔵 蓝色圆点: 当前步骤
- ⚪ 灰色圆点: 未开始步骤

### 4.3 按钮状态

- **"Submit for Evaluation"**: 提交当前步骤内容进行评估
- **"View Feedback"**: 查看Native表达建议(评估后显示)
- **"Next Step"**: 进入下一步骤(评估后显示)
- **"Save Essay"**: 保存整篇作文(完成所有步骤后显示)

## 5. Agent Tools修改

### 5.1 新增/修改的Tools

#### `startGuidedWriting` (新增)
```typescript
// 输入: topic(可选), level
// 输出: GuidedWritingData (包含topic, currentStep, tips等)
```

#### `evaluateStep` (新增)
```typescript
// 输入: stepName, content, topic
// 输出: StepEvaluation (包含score, feedback, nativeSuggestions, nextStep)
```

#### `getNextStep` (新增)
```typescript
// 输入: currentStepName
// 输出: WritingStep (下一步骤的指导内容)
```

### 5.2 Agent System Prompt更新

```
When user wants to practice writing:
1. Use generateTopic or accept user's topic
2. Use analyzeTopic to analyze the topic
3. Use startGuidedWriting to begin the guided workflow
4. Display [OPTION:开始写作] button with the writing data

When user submits a step for evaluation:
1. Use evaluateStep to evaluate the content
2. Return score, feedback, and native suggestions
3. If not the last step, provide nextStep data
```

## 6. 实现伪代码

### 6.1 WritingModal组件修改

```typescript
// 新增状态
const [guidedMode, setGuidedMode] = useState(false);
const [guidedData, setGuidedData] = useState<GuidedWritingData | null>(null);
const [currentStepContent, setCurrentStepContent] = useState('');
const [stepEvaluation, setStepEvaluation] = useState<StepEvaluation | null>(null);

// 开始引导写作
function startGuidedWriting(data: GuidedWritingData) {
  setGuidedMode(true);
  setGuidedData(data);
  setCurrentStepContent('');
  setStepEvaluation(null);
}

// 提交步骤评估
async function submitStepForEvaluation() {
  const response = await fetch('/api/evaluate-step', {
    method: 'POST',
    body: JSON.stringify({
      topic: guidedData.topic,
      stepName: guidedData.currentStep.name,
      content: currentStepContent,
    }),
  });
  const evaluation = await response.json();
  setStepEvaluation(evaluation);
  
  // 更新completedSteps
  guidedData.completedSteps.push({
    stepName: guidedData.currentStep.name,
    content: currentStepContent,
    score: evaluation.score,
    feedback: evaluation.feedback,
    nativeSuggestions: evaluation.nativeSuggestions,
  });
}

// 进入下一步
function goToNextStep() {
  if (stepEvaluation?.nextStep) {
    setGuidedData({
      ...guidedData,
      currentStep: stepEvaluation.nextStep,
    });
    setCurrentStepContent('');  // 清空编辑器
    setStepEvaluation(null);
  }
}

// 查看反馈
function viewFeedback() {
  // 将nativeSuggestions显示在右侧AI Suggestions tab
  setMockAISuggestions(stepEvaluation.nativeSuggestions);
  // 切换到AI Suggestions tab
  setActiveTab('ai-suggestions');
}
```

### 6.2 AgentModal组件修改

```typescript
// 处理"开始写作"选项点击
function handleOptionClick(option: string, data?: any) {
  if (option === '开始写作' && data?.guidedWritingData) {
    setIsWritingModalOpen(true);
    // 传递guidedWritingData给WritingModal
    writingModalRef.current?.startGuidedWriting(data.guidedWritingData);
  }
}
```

### 6.3 新增API Route: /api/evaluate-step

```typescript
// POST /api/evaluate-step
export async function POST(request: NextRequest) {
  const { topic, stepName, content, apiToken, aiModel } = await request.json();
  
  // 调用AI评估
  const result = await generateObject({
    model: openai(aiModel),
    schema: z.object({
      score: z.number(),
      feedback: z.string(),
      nativeSuggestions: z.array(z.object({
        start: z.number(),
        end: z.number(),
        type: z.string(),
        message: z.string(),
        problemText: z.string(),
        replacements: z.array(z.string()),
      })),
    }),
    prompt: `Evaluate this ${stepName} for the topic "${topic}":\n\n${content}\n\nProvide score (0-100), feedback, and native expression suggestions.`,
  });
  
  // 获取下一步骤
  const nextStep = getNextStepData(stepName);
  
  return NextResponse.json({
    ...result.object,
    nextStep,
    isComplete: stepName === 'conclusion',
  });
}
```

## 7. 实现步骤

1. ✅ 创建新分支 `feature/guided-writing-workflow`
2. ⬜ 修改`writing-agent-tools.ts`:添加`startGuidedWriting`, `evaluateStep`, `getNextStep`
3. ⬜ 创建`/api/evaluate-step/route.ts`
4. ⬜ 修改`WritingModal.tsx`:
   - 添加guidedMode状态和UI
   - 实现左侧面板(题目、流程指示器、Tips、编辑器)
   - 实现按钮逻辑(Submit, View Feedback, Next Step)
5. ⬜ 修改`AgentModal.tsx`:处理"开始写作"选项并传递数据
6. ⬜ 修改`/api/chat/route.ts`:更新system prompt
7. ⬜ 测试完整流程

## 8. 注意事项

- 保留现有WritingModal的所有功能(Harper检查、AI建议、文本选择popup等)
- guidedMode和普通模式可以共存,通过状态切换
- 每个步骤的内容需要累积保存,最后生成完整作文
- Native建议使用现有的AIStructuredSuggestion格式和显示逻辑
- 流程指示器需要实时更新状态和评分

