import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      stepName,
      content,
      level = 'intermediate',
      apiToken,
      aiModel = 'gpt-4o-mini',
      aiProvider = 'openai'
    } = body || {};

    // Check for API token
    if (!apiToken) {
      return NextResponse.json(
        { error: 'API_TOKEN_NOT_SET', message: 'API Token is required' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!topic || !stepName || !content) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Topic, stepName, and content are required' },
        { status: 400 }
      );
    }

    // Create AI client based on provider
    let aiClient;
    if (aiProvider === 'deepseek') {
      aiClient = createOpenAI({
        apiKey: apiToken,
        baseURL: 'https://api.deepseek.com/v1'
      });
    } else {
      aiClient = createOpenAI({
        apiKey: apiToken,
      });
    }

    // Define the evaluation schema
    const evaluationSchema = z.object({
      score: z.number().min(0).max(100).describe('Score from 0 to 100'),
      feedback: z.string().describe('Overall feedback on the writing'),
      nativeSuggestions: z.array(
        z.object({
          start: z.number().describe('Start position in text'),
          end: z.number().describe('End position in text'),
          type: z.enum(['native-expression', 'word-choice', 'sentence-structure']).describe('Type of suggestion'),
          message: z.string().describe('Explanation of the suggestion'),
          problemText: z.string().describe('The original text that needs improvement'),
          replacements: z.array(z.string()).describe('Suggested replacements'),
        })
      ).describe('Native expression suggestions'),
    });

    // Create evaluation prompt based on step
    const stepInstructions: Record<string, string> = {
      introduction: 'Evaluate the introduction. Check if it has a hook, background information, and a clear thesis statement.',
      body1: 'Evaluate the first body paragraph. Check if it has a clear topic sentence, supporting evidence, and proper explanation.',
      body2: 'Evaluate the second body paragraph. Check for topic sentence, different evidence than paragraph 1, and logical flow.',
      body3: 'Evaluate the third body paragraph. Check for final main point or counterargument handling.',
      conclusion: 'Evaluate the conclusion. Check if it restates the thesis, summarizes main points, and ends with impact.',
    };

    const instruction = stepInstructions[stepName] || 'Evaluate this writing section.';

    const prompt = `You are an expert English writing teacher evaluating a student's ${stepName} for the topic: "${topic}"

Student's level: ${level}

${instruction}

Provide:
1. A score from 0-100 based on:
   - Content relevance and development (40%)
   - Organization and structure (30%)
   - Language use and native expression (30%)

2. Constructive feedback highlighting strengths and areas for improvement

3. Native expression suggestions: Identify phrases or sentences that could be more natural or native-like. For each suggestion:
   - Specify the exact start and end character positions
   - Explain why it sounds non-native
   - Provide 2-3 more natural alternatives

Student's ${stepName}:
${content}

Be encouraging but honest. Focus on helping the student write more like a native speaker.`;

    // Generate evaluation
    const result = await generateObject({
      model: aiClient(aiModel),
      schema: evaluationSchema,
      prompt,
    });

    // Determine if this is the last step
    const isComplete = stepName === 'conclusion';

    // Get next step name
    const stepSequence = ['introduction', 'body1', 'body2', 'body3', 'conclusion'];
    const currentIndex = stepSequence.indexOf(stepName);
    const nextStepName = currentIndex < stepSequence.length - 1 ? stepSequence[currentIndex + 1] : null;

    return NextResponse.json({
      score: result.object.score,
      feedback: result.object.feedback,
      nativeSuggestions: result.object.nativeSuggestions,
      isComplete,
      nextStepName,
    });

  } catch (error: any) {
    console.error('Error in evaluate-step API:', error);
    
    // Handle specific errors
    if (error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'INVALID_API_KEY', message: 'Invalid API Token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'EVALUATION_FAILED', message: error?.message || 'Failed to evaluate writing' },
      { status: 500 }
    );
  }
}

