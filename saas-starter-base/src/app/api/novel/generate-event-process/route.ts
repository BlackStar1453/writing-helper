/**
 * 生成事件流程 API
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { eventName, eventOutline, apiToken, model, existingCharacters } = await request.json();

    if (!eventName || !eventOutline) {
      return NextResponse.json(
        { error: 'Missing event name or outline' },
        { status: 400 }
      );
    }

    if (!apiToken) {
      return NextResponse.json(
        { error: 'Missing API token' },
        { status: 400 }
      );
    }

    // 构建 Prompt
    const prompt = buildEventProcessPrompt(eventName, eventOutline, existingCharacters || []);

    // 调用 AI API
    const aiModel = model || 'deepseek-chat';
    const apiUrl = getApiUrl(aiModel);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: `你是一位专业的小说作家,擅长分析和规划事件流程,并能够创造生动的人物形象。

重要要求:
1. 你必须严格按照用户指定的格式输出
2. 输出必须包含两个部分: "### 事件流程" 和 "### 涉及人物"
3. 不要添加任何额外的说明文字或总结
4. 人物信息必须包含: 名字、基本信息、外貌、性格、人物弧光五个字段
5. 使用markdown格式输出`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'AI API request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // 调试日志
    console.log('=== AI Raw Response ===');
    console.log(rawContent);
    console.log('======================');

    // 解析事件流程和人物信息
    const { process, characters } = parseEventProcessAndCharacters(rawContent);

    console.log('=== Parsed Result ===');
    console.log('Process:', process.length, 'items');
    console.log('Characters:', characters.length, 'items');
    console.log('=====================');

    return NextResponse.json({ process, characters });
  } catch (error) {
    console.error('Generate event process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 构建事件流程生成 Prompt
 */
function buildEventProcessPrompt(
  eventName: string,
  eventOutline: string,
  existingCharacters: Array<{ name: string; description?: string }>
): string {
  const parts: string[] = [];

  parts.push(`## 事件名称`);
  parts.push(eventName);
  parts.push('');

  parts.push(`## 事件大纲`);
  parts.push(eventOutline);
  parts.push('');

  if (existingCharacters.length > 0) {
    parts.push(`## 已关联的人物`);
    existingCharacters.forEach((char) => {
      parts.push(`- ${char.name}${char.description ? ': ' + char.description : ''}`);
    });
    parts.push('');
  }

  parts.push(`## 任务`);
  parts.push(`请根据以上事件名称和大纲,生成详细的事件流程(前因后果)和涉及的人物信息。要求:`);
  parts.push('');
  parts.push(`### 事件流程要求:`);
  parts.push(`1. 清晰地列出事件发生的各个步骤`);
  parts.push(`2. 每个步骤应该简洁明了,说明在这个阶段发生了什么`);
  parts.push(`3. 步骤之间应该有逻辑连贯性,体现事件的发展过程`);
  parts.push(`4. 生成4-8个事件流程步骤`);
  parts.push('');
  parts.push(`### 人物信息要求:`);
  parts.push(`1. 列出事件中涉及的主要人物(2-5个)`);
  if (existingCharacters.length > 0) {
    parts.push(`2. 对于已关联的人物,可以补充更详细的信息`);
    parts.push(`3. 如果需要新人物,请创建新的人物信息`);
  } else {
    parts.push(`2. 为每个人物提供完整的人物侧写`);
  }
  parts.push(`3. 基本信息应包含: 年龄、性别、职业等`);
  parts.push(`4. 外貌描写应该具体生动,包含身高、体型、发型、穿着等特征`);
  parts.push(`5. 性格描写应该体现人物的性格特点、行为习惯、说话方式等`);
  parts.push(`6. 人物弧光应该描述人物在事件中的成长轨迹和变化`);
  parts.push('');

  parts.push(`## 输出格式`);
  parts.push(`请严格按照以下格式输出:`);
  parts.push('');
  parts.push(`### 事件流程`);
  parts.push(`1. [第一个步骤的描述]`);
  parts.push(`2. [第二个步骤的描述]`);
  parts.push(`3. [第三个步骤的描述]`);
  parts.push(`...`);
  parts.push('');
  parts.push(`### 涉及人物`);
  parts.push(`**人物1**`);
  parts.push(`- 名字: [人物名字]`);
  parts.push(`- 基本信息: [年龄、性别、职业等]`);
  parts.push(`- 外貌: [外貌描写]`);
  parts.push(`- 性格: [性格描写]`);
  parts.push(`- 人物弧光: [人物成长轨迹和变化]`);
  parts.push('');
  parts.push(`**人物2**`);
  parts.push(`- 名字: [人物名字]`);
  parts.push(`- 基本信息: [年龄、性别、职业等]`);
  parts.push(`- 外貌: [外貌描写]`);
  parts.push(`- 性格: [性格描写]`);
  parts.push(`- 人物弧光: [人物成长轨迹和变化]`);
  parts.push('');
  parts.push(`注意:只输出以上格式的内容,不要添加其他说明文字。`);

  return parts.join('\n');
}

/**
 * 解析生成的事件流程和人物信息
 */
function parseEventProcessAndCharacters(rawContent: string): {
  process: Array<{ description: string }>;
  characters: Array<{
    name: string;
    description: string;
    appearance: string;
    personality: string;
    characterArc: string;
  }>;
} {
  const process: Array<{ description: string }> = [];
  const characters: Array<{
    name: string;
    description: string;
    appearance: string;
    personality: string;
    characterArc: string;
  }> = [];

  const lines = rawContent.split('\n');
  let currentSection: 'process' | 'characters' | null = null;
  let currentCharacter: {
    name?: string;
    description?: string;
    appearance?: string;
    personality?: string;
    characterArc?: string;
  } | null = null;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // 检测章节标题
    if (trimmedLine.includes('事件流程') || trimmedLine.includes('### 事件流程')) {
      currentSection = 'process';
      return;
    }
    if (trimmedLine.includes('涉及人物') || trimmedLine.includes('### 涉及人物')) {
      currentSection = 'characters';
      // 保存之前的人物
      if (currentCharacter && currentCharacter.name) {
        characters.push({
          name: currentCharacter.name,
          description: currentCharacter.description || '',
          appearance: currentCharacter.appearance || '',
          personality: currentCharacter.personality || '',
          characterArc: currentCharacter.characterArc || ''
        });
        currentCharacter = null;
      }
      return;
    }

    // 解析事件流程
    if (currentSection === 'process') {
      const match = trimmedLine.match(/^\s*\d+[.、]\s*(.+)$/);
      if (match) {
        process.push({
          description: match[1].trim()
        });
      }
    }

    // 解析人物信息
    if (currentSection === 'characters') {
      // 检测新人物开始 (支持 **人物1** 或 **林逸** 格式)
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        // 保存之前的人物
        if (currentCharacter && currentCharacter.name) {
          characters.push({
            name: currentCharacter.name,
            description: currentCharacter.description || '',
            appearance: currentCharacter.appearance || '',
            personality: currentCharacter.personality || '',
            characterArc: currentCharacter.characterArc || ''
          });
        }
        currentCharacter = {};
        return;
      }

      // 解析人物属性
      const nameMatch = trimmedLine.match(/^[-*]?\s*名字[:：]\s*(.+)$/);
      if (nameMatch && currentCharacter) {
        currentCharacter.name = nameMatch[1].trim();
        return;
      }

      const descriptionMatch = trimmedLine.match(/^[-*]?\s*基本信息[:：]\s*(.+)$/);
      if (descriptionMatch && currentCharacter) {
        currentCharacter.description = descriptionMatch[1].trim();
        return;
      }

      const appearanceMatch = trimmedLine.match(/^[-*]?\s*外貌[:：]\s*(.+)$/);
      if (appearanceMatch && currentCharacter) {
        currentCharacter.appearance = appearanceMatch[1].trim();
        return;
      }

      const personalityMatch = trimmedLine.match(/^[-*]?\s*性格[:：]\s*(.+)$/);
      if (personalityMatch && currentCharacter) {
        currentCharacter.personality = personalityMatch[1].trim();
        return;
      }

      const characterArcMatch = trimmedLine.match(/^[-*]?\s*人物弧光[:：]\s*(.+)$/);
      if (characterArcMatch && currentCharacter) {
        currentCharacter.characterArc = characterArcMatch[1].trim();
        return;
      }
    }
  });

  // 保存最后一个人物
  if (currentCharacter && currentCharacter.name) {
    characters.push({
      name: currentCharacter.name,
      description: currentCharacter.description || '',
      appearance: currentCharacter.appearance || '',
      personality: currentCharacter.personality || '',
      characterArc: currentCharacter.characterArc || ''
    });
  }

  return { process, characters };
}

/**
 * 根据模型获取 API URL
 */
function getApiUrl(model: string): string {
  if (model.startsWith('deepseek')) {
    return 'https://api.deepseek.com/v1/chat/completions';
  } else if (model.startsWith('gpt')) {
    return 'https://api.openai.com/v1/chat/completions';
  } else {
    // 默认使用 DeepSeek
    return 'https://api.deepseek.com/v1/chat/completions';
  }
}

