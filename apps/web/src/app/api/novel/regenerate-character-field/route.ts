import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { characterName, fieldName, currentValue, requirement, apiToken, model } = await request.json();

    if (!characterName || !fieldName || !requirement || !apiToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 构建提示词
    const fieldLabels: Record<string, string> = {
      description: '基本信息（包含年龄、性别、职业等）',
      appearance: '外貌描述',
      personality: '性格描述',
      characterArc: '人物弧光'
    };

    const systemPrompt = `你是一位专业的小说作家，擅长创造生动的人物形象。

重要要求:
1. 你必须严格按照用户的要求重新生成内容
2. 只输出生成的内容，不要添加任何额外的说明文字
3. 内容应该简洁、生动、具体`;

    const userPrompt = `人物名称: ${characterName}
字段类型: ${fieldLabels[fieldName] || fieldName}

当前内容:
${currentValue}

用户要求:
${requirement}

请根据用户要求重新生成该字段的内容。只输出生成的内容，不要添加任何额外说明。`;

    // 调用AI API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI API error:', errorData);
      return NextResponse.json(
        { error: 'AI API request failed', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const newValue = data.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ newValue });
  } catch (error) {
    console.error('Error in regenerate-character-field API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

