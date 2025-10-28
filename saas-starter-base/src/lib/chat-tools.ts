import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// Tool 1: 分析文本和错误
export const analyzeTextTool = tool(
  async ({ text, errors }) => {
    const analysis = {
      errorCount: errors.length,
      summary: errors.length > 0 
        ? `I found ${errors.length} grammar ${errors.length === 1 ? 'error' : 'errors'} in your text.`
        : 'Your text looks good! No grammar errors detected.',
      errors: errors.map((e: any) => ({
        type: e.typePretty || e.type,
        problem: e.problemText,
        position: `characters ${e.position.start}-${e.position.end}`,
        suggestion: e.suggestions[0]?.replacementText || 'No suggestion available',
        message: e.message,
      })),
    };
    return JSON.stringify(analysis, null, 2);
  },
  {
    name: 'analyze_text',
    description: 'Analyze the user\'s text and detect grammar errors. Use this when the user asks you to analyze their writing or when you need to check for errors.',
    schema: z.object({
      text: z.string().describe('The text to analyze'),
      errors: z.array(
        z.object({
          type: z.string(),
          typePretty: z.string().optional(),
          message: z.string(),
          messageHtml: z.string().optional(),
          problemText: z.string(),
          position: z.object({ start: z.number(), end: z.number() }),
          suggestions: z
            .array(
              z.object({
                kind: z.number().optional(),
                replacementText: z.string().optional(),
              })
            )
            .optional(),
          json: z.string().optional(),
        })
      ).describe('Array of detected errors from grammar checker'),
    }),
  }
);

// Tool 2: 解释特定错误
export const explainErrorTool = tool(
  async ({ errorType, problemText, context }) => {
    const explanation = {
      errorType,
      problemText,
      context,
      explanation: `This is a "${errorType}" error. The problematic text is "${problemText}".`,
      tip: 'I can provide more detailed explanations based on the specific error type.',
    };
    return JSON.stringify(explanation, null, 2);
  },
  {
    name: 'explain_error',
    description: 'Explain a specific grammar error in detail. Use this when the user asks about a particular error or needs clarification.',
    schema: z.object({
      errorType: z.string().describe('The type of grammar error'),
      problemText: z.string().describe('The problematic text'),
      context: z.string().describe('The surrounding context of the error'),
    }),
  }
);

// Tool 3: 提供改进建议
export const suggestImprovementTool = tool(
  async ({ text, aspect }) => {
    const suggestion = {
      aspect,
      text,
      suggestion: `Here are some suggestions to improve the ${aspect} of your writing.`,
      tips: [
        'Use more varied vocabulary',
        'Consider sentence structure',
        'Check for clarity and conciseness',
      ],
    };
    return JSON.stringify(suggestion, null, 2);
  },
  {
    name: 'suggest_improvement',
    description: 'Provide suggestions to improve specific aspects of the writing (style, clarity, vocabulary, etc.). Use this when the user asks for improvement suggestions.',
    schema: z.object({
      text: z.string().describe('The text to improve'),
      aspect: z.string().describe('The aspect to focus on (e.g., "style", "clarity", "vocabulary")'),
    }),
  }
);

export const chatTools = [analyzeTextTool, explainErrorTool, suggestImprovementTool];

