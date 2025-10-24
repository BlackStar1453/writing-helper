import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// Define the schema for AI structured suggestions
const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      start: z.number().describe('Start position of the error in the text'),
      end: z.number().describe('End position of the error in the text'),
      type: z.string().describe('Error type, e.g., Grammar, Spelling, Style, Clarity'),
      message: z.string().describe('Detailed explanation of the error'),
      problemText: z.string().describe('The problematic text'),
      replacements: z.array(z.string()).describe('List of suggested replacements'),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, apiToken, aiModel, aiProvider = 'openai' } = body || {};

    // Check for API key - prioritize user's token, no fallback
    const apiKey = apiToken;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API_TOKEN_NOT_SET', message: 'Please set your API Token in settings' },
        { status: 401 }
      );
    }

    // Validate text
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

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

    // Use user's selected model or default based on provider
    const modelToUse = aiModel || (aiProvider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini');

    // Generate structured suggestions using generateObject
    const result = await generateObject({
      model: aiClient(modelToUse),
      schema: suggestionSchema,
      schemaName: 'WritingSuggestions',
      schemaDescription: 'A list of writing suggestions with error positions and replacements',
      prompt: `Analyze the following text and provide detailed writing suggestions.

IMPORTANT: For position calculation:
- 'start' is the character index where the problematic text begins (0-based)
- 'end' is the character index where the problematic text ends (exclusive, like substring)
- 'problemText' must EXACTLY match text.substring(start, end)
- Count characters carefully, including spaces and punctuation

For each issue you find, provide:
1. The exact start position (character index, 0-based)
2. The exact end position (character index, exclusive)
3. The type of error (Grammar, Spelling, Style, Clarity, etc.)
4. A clear explanation of the issue
5. The problematic text (must match text[start:end])
6. 1-3 suggested replacements

Text to analyze (length: ${text.length} characters):
"""
${text}
"""

Example: If the text is "I has a problem" and you want to flag "has", then:
- start: 2 (position of 'h')
- end: 5 (position after 's')
- problemText: "has"

Please be thorough but focus on the most important issues. Provide specific, actionable suggestions.`,
      temperature: 0.3,
    });

    // Validate and fix positions
    const validatedSuggestions = result.object.suggestions.map((suggestion) => {
      const actualText = text.substring(suggestion.start, suggestion.end);

      // Log for debugging
      console.log('Suggestion validation:', {
        start: suggestion.start,
        end: suggestion.end,
        problemText: suggestion.problemText,
        actualText: actualText,
        match: actualText === suggestion.problemText
      });

      // If positions don't match, try to find the correct position
      if (actualText !== suggestion.problemText) {
        const index = text.indexOf(suggestion.problemText);
        if (index !== -1) {
          console.log(`Fixed position for "${suggestion.problemText}": ${index} -> ${index + suggestion.problemText.length}`);
          return {
            ...suggestion,
            start: index,
            end: index + suggestion.problemText.length
          };
        }
      }

      return suggestion;
    });

    return NextResponse.json({
      suggestions: validatedSuggestions,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze text',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

