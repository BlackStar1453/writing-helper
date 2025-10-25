/**
 * API路由: 测试Prompt卡片生成
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { promptDescription, exampleBefore, testInput, temperature } = await request.json();

    // 构建prompt
    const systemPrompt = `你是一个专业的文本改写助手。请根据以下要求改写用户提供的文本:

${promptDescription}

${exampleBefore ? `参考示例:\n${exampleBefore}` : ''}

请严格按照上述要求改写文本,保持原意但改变表达方式。`;

    const userPrompt = `请改写以下文本:\n\n${testInput}`;

    // 调用AI API
    const aiProvider = process.env.AI_PROVIDER || 'openai';
    let generatedText = '';

    if (aiProvider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const data = await response.json();
      generatedText = data.choices[0].message.content;
    } else {
      // OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      generatedText = data.choices[0].message.content;
    }

    return NextResponse.json({ generatedText });
  } catch (error) {
    console.error('Test prompt error:', error);
    return NextResponse.json(
      { error: 'Failed to generate text' },
      { status: 500 }
    );
  }
}

