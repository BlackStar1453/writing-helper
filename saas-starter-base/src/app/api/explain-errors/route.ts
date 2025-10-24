import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// 定义工具:提供更详细的语法解释
const explainGrammarTool = tool(
  async ({ errorType, problemText, suggestion, context }) => {
    return JSON.stringify({
      errorType,
      problemText,
      suggestion,
      context,
      explanation: `This is a ${errorType} error. The text "${problemText}" should be corrected to "${suggestion}".`,
    });
  },
  {
    name: 'explain_grammar',
    description: 'Explain a grammar error in detail with examples',
    schema: z.object({
      errorType: z.string().describe('The type of grammar error'),
      problemText: z.string().describe('The problematic text'),
      suggestion: z.string().describe('The suggested correction'),
      context: z.string().describe('The context where the error appears'),
    }),
  }
);

export async function POST(request: NextRequest) {
  try {
    const { text, errors } = await request.json();

    if (!text || !errors || !Array.isArray(errors)) {
      return NextResponse.json(
        { error: 'Invalid request. Please provide text and errors array.' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Create LLM
    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      openAIApiKey: apiKey,
    });

    // Create agent with tools
    const agent = createReactAgent({
      llm,
      tools: [explainGrammarTool],
    });

    // Format errors for the prompt
    const errorsText = errors
      .map((error: any, index: number) => {
        return `Error ${index + 1}:
- Type: ${error.typePretty || error.type}
- Problem: "${error.problemText}"
- Position: ${error.position.start}-${error.position.end}
- Message: ${error.message}
${error.suggestions && error.suggestions.length > 0 ? `- Suggestions: ${error.suggestions.map((s: any) => s.replacementText).join(', ')}` : ''}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an English writing tutor. Your role is to:
1. Analyze grammar errors in the user's text
2. Explain why each error is incorrect
3. Provide detailed explanations with examples
4. Suggest better, more native expressions

Be clear, concise, and educational in your explanations.`;

    const userPrompt = `${systemPrompt}

Please analyze the following text and explain the grammar errors in detail:

Original Text:
"${text}"

Detected Errors:
${errorsText}

For each error, please:
1. Explain why it's incorrect
2. Provide the correct form
3. Give examples of proper usage
4. Suggest more native expressions if applicable`;

    // Run agent
    const result = await agent.invoke({
      messages: [new HumanMessage(userPrompt)],
    });

    // Extract the final response
    const lastMessage = result.messages[result.messages.length - 1];
    const explanation = lastMessage.content;

    return NextResponse.json({
      explanation,
      success: true,
    });
  } catch (error) {
    console.error('Error in explain-errors API:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

