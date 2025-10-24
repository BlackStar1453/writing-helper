import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { writingAgentTools } from '@/lib/writing-agent-tools';

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, text, errors, agentType = 'main', apiToken, aiProvider = 'openai', aiModel } = body || {};

    // Check for API key - only use user's token, no fallback
    const apiKey = apiToken;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API_TOKEN_NOT_SET', message: 'Please set your API Token in settings' },
        { status: 401 }
      );
    }

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Define different system prompts for different agents
    const getSystemPrompt = (type: string) => {
      switch (type) {
        case 'main':
          // Main Agent: 初始界面的AI Agent with tools
          return `You are a professional English writing coach that guides students through the complete writing process.

Your role is to:
1. Help students select appropriate essay topics based on their level
2. Provide step-by-step guided writing workflow
3. Evaluate completed essays with detailed feedback and scores

**Available Tools:**
- startGuidedWriting: Start a guided writing workflow with a topic and first step guidance
- getNextStep: Get the next writing step guidance after completing current step

**Guided Writing Workflow:**
When user wants to practice writing:
1. Use startGuidedWriting tool to begin the workflow with a topic
2. The tool will return guidedWritingData containing:
   - topic: The writing topic
   - level: Student's level (beginner/intermediate/advanced)
   - currentStep: First step guidance (introduction)
   - completedSteps: Empty array initially

3. After calling the tool, display a button for the user to start writing:
   [OPTION:开始写作]

4. Include the guidedWritingData in your response using this format:
   [GUIDED_DATA:{"topic":"...","level":"...","currentStep":{...},"completedSteps":[]}]

5. The writing modal will handle the step-by-step evaluation and progression
6. User will write each section, submit for evaluation, view feedback, and move to next step
7. After all 5 steps (introduction, body1, body2, body3, conclusion) are complete, the essay is finished

**Important:**
- Always use startGuidedWriting when user wants to practice writing
- Include both [OPTION:开始写作] and [GUIDED_DATA:...] in your response
- Be encouraging and adapt guidance to student's level

Current context:
- User's text: ${text ? JSON.stringify(text) : 'No text provided'}
- Detected errors: ${Array.isArray(errors) ? errors.length : 0}`;

        case 'assistant':
          // Writing Assistant: 统一的写作助手
          return `You are a professional English teacher helping students learn English writing.

Your role is to:
1. Answer students' questions about grammar, vocabulary, and writing style
2. Explain concepts clearly with examples
3. Provide constructive feedback and suggestions
4. Help students express their ideas more effectively
5. Be encouraging, patient, and educational

The student may ask you questions while writing or after submitting their work.
You have access to their writing content as context when they ask questions.

Provide accurate, appropriate, and helpful responses based on their questions.
Be concise but thorough in your explanations.`;

        default:
          return getSystemPrompt('main');
      }
    };

    const systemMessage = {
      role: 'system' as const,
      content: getSystemPrompt(agentType),
    };

    // Create AI client based on provider
    let aiClient;
    if (aiProvider === 'deepseek') {
      aiClient = createOpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1'
      });
    } else {
      aiClient = createOpenAI({ apiKey });
    }

    // Normalize messages: ensure all messages have parts array
    const normalizedMessages = messages.map((msg: any) => {
      if (!msg.parts && msg.content) {
        // Convert old format (content) to new format (parts)
        return {
          ...msg,
          parts: [{ type: 'text', text: String(msg.content) }],
        };
      }
      return msg;
    });

    // Convert UI messages to model messages using AI SDK utility
    const modelMessages = convertToModelMessages(normalizedMessages as UIMessage[]);

    // Use user's selected model or default based on provider
    const modelToUse = aiModel || (aiProvider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini');

    // For main agent, add tools and enable multi-step calls
    const result = streamText({
      model: aiClient(modelToUse),
      system: systemMessage.content,
      messages: modelMessages,
      temperature: 0.7,
      ...(agentType === 'main' ? {
        tools: {
          startGuidedWriting: writingAgentTools.startGuidedWriting,
          getNextStep: writingAgentTools.getNextStep,
        },
        stopWhen: stepCountIs(5), // Allow up to 5 steps for guided writing workflow
      } : {}),
    });

    // 获取原始response
    const response = result.toUIMessageStreamResponse();

    // 创建throttled stream来控制流式响应速度
    const originalBody = response.body;
    if (!originalBody) {
      return response;
    }

    const throttledStream = new ReadableStream({
      async start(controller) {
        const reader = originalBody.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 添加延迟来控制流式响应速度
            await delay(30); // 每30ms发送一次chunk
            controller.enqueue(value);
          }
        } finally {
          controller.close();
          reader.releaseLock();
        }
      }
    });

    return new Response(throttledStream, {
      headers: response.headers,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

