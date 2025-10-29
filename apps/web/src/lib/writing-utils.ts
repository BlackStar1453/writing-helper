/**
 * Writing Assistant Utilities
 *
 * 提供选项解析和消息格式化功能
 */

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  type: string;
  typePretty: string;
  message: string;
  messageHtml: string;
  problemText: string;
  position: { start: number; end: number };
  suggestions: Array<{
    kind: number;
    replacementText: string;
  }>;
  json: string;
}

/**
 * AI增强建议接口
 */
export interface AISuggestion {
  problemText: string;
  suggestion: string;
  explanation: string;
  category: 'grammar' | 'spelling' | 'style' | 'clarity' | 'other';
  position?: { start: number; end: number };
}

/**
 * AI结构化建议接口
 */
export interface AIStructuredSuggestion {
  start: number;
  end: number;
  type: string; // 错误类型,如 "Grammar", "Style", "Clarity"
  message: string; // 错误说明
  problemText: string; // 问题文本
  replacements: string[]; // 修改建议列表
}

/**
 * Chat消息接口
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Chat会话接口
 */
export interface ChatSession {
  id: string;
  title: string; // 会话标题,从第一条用户消息生成
  messages: ChatMessage[];
  createdAt: number; // 时间戳
  actionType?: string; // 触发的action类型,如 'better-word', 'explain'等
}

/**
 * 写作历史记录接口
 */
export interface WritingHistory {
  id: string;
  title: string; // 标题,从内容前30个字符生成
  content: string; // 写作内容
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳
}

/**
 * 写作数据接口
 */
export interface WritingData {
  userText: string;
  errors: ErrorInfo[];
}

/**
 * 引导写作步骤接口
 */
export interface WritingStep {
  name: 'introduction' | 'body1' | 'body2' | 'body3' | 'conclusion';
  displayName: string;
  instruction: string;
  tips: string[];
  example?: string;
}

/**
 * 步骤结果接口
 */
export interface StepResult {
  stepName: string;
  content: string;
  score: number;
  feedback: string;
  nativeSuggestions: AIStructuredSuggestion[];
}

/**
 * 引导写作数据接口
 */
export interface GuidedWritingData {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  currentStep: WritingStep;
  completedSteps: StepResult[];
}

/**
 * 步骤评估结果接口
 */
export interface StepEvaluation {
  score: number;
  feedback: string;
  nativeSuggestions: AIStructuredSuggestion[];
  nextStepName?: string;
  isComplete: boolean;
}

/**
 * 解析消息中的选项
 *
 * 格式: [OPTION:选项名称]
 *
 * @param content - 消息内容
 * @returns 选项数组
 *
 * @example
 * parseMessageOptions("Hello [OPTION:开始写作] world")
 * // => ["开始写作"]
 */
export function parseMessageOptions(content: string): string[] {
  const optionRegex = /\[OPTION:([^\]]+)\]/g;
  const options: string[] = [];
  let match;

  while ((match = optionRegex.exec(content)) !== null) {
    options.push(match[1]);
  }

  return options;
}

/**
 * 移除消息中的选项标记
 *
 * @param content - 消息内容
 * @returns 清理后的内容
 *
 * @example
 * removeOptionTags("Hello [OPTION:开始写作] world")
 * // => "Hello  world"
 */
export function removeOptionTags(content: string): string {
  return content.replace(/\[OPTION:([^\]]+)\]/g, '');
}

/**
 * 计算文本中指定位置的行号
 *
 * @param text - 完整文本
 * @param position - 字符位置
 * @returns 行号(从1开始)
 */
function calculateLineNumber(text: string, position: number): number {
  return text.substring(0, position).split('\n').length;
}

/**
 * 格式化写作数据为发送给Agent的消息
 *
 * 使用混合格式:文本描述 + 结构化信息
 *
 * @param data - 写作数据
 * @returns 格式化的消息
 */
export function formatWritingMessage(data: WritingData): string {
  const { userText, errors } = data;

  let message = `我完成了写作,请帮我分析和优化:\n\n`;
  message += `【我的写作内容】\n${userText}\n\n`;

  if (errors.length > 0) {
    message += `【检测到的问题】\n`;
    message += `共发现 ${errors.length} 个问题:\n\n`;

    errors.forEach((error, index) => {
      const line = calculateLineNumber(userText, error.position.start);
      message += `${index + 1}. 错误类型: ${error.typePretty}\n`;
      message += `   问题文本: "${error.problemText}"\n`;
      message += `   位置: 第${line}行\n`;
      message += `   说明: ${error.message}\n`;

      if (error.suggestions.length > 0) {
        const suggestionTexts = error.suggestions
          .map(s => s.replacementText)
          .filter(t => t)
          .join(', ');
        if (suggestionTexts) {
          message += `   建议: ${suggestionTexts}\n`;
        }
      }
      message += `\n`;
    });
  } else {
    message += `【检测结果】\n未发现语法或拼写错误。\n\n`;
  }

  message += `请帮我:\n`;
  message += `1. 解释每个错误的原因\n`;
  message += `2. 提供优化建议\n`;
  message += `3. 给出改写示例\n`;

  return message;
}

/**
 * 解析消息中的AI建议
 *
 * 格式: [AI_SUGGESTIONS:{JSON}]
 *
 * @param content - 消息内容
 * @returns AI建议数组
 *
 * @example
 * parseAISuggestions("Here are my suggestions [AI_SUGGESTIONS:{...}]")
 * // => [{ problemText: "...", suggestion: "...", ... }]
 */
export function parseAISuggestions(content: string): AISuggestion[] {
  const regex = /\[AI_SUGGESTIONS:([\s\S]*?)\]/;
  const match = content.match(regex);

  if (!match) return [];

  try {
    const data = JSON.parse(match[1]);
    if (data.suggestions && Array.isArray(data.suggestions)) {
      return data.suggestions;
    }
  } catch (error) {
    console.error('[parseAISuggestions] Failed to parse AI suggestions:', error);
  }

  return [];
}

/**
 * 移除消息中的AI建议标记
 *
 * @param content - 消息内容
 * @returns 清理后的内容
 */
export function removeAISuggestionsTags(content: string): string {
  return content.replace(/\[AI_SUGGESTIONS:[\s\S]*?\]/g, '');
}

