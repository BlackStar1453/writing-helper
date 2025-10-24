/**
 * 生成章节Timeline API
 */

import { NextRequest, NextResponse } from 'next/server';
import { NovelContext } from '@/lib/novel/types';

export async function POST(request: NextRequest) {
  try {
    const { context, apiToken, model } = await request.json();

    if (!context) {
      return NextResponse.json(
        { error: 'Missing context' },
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
    const prompt = buildTimelinePrompt(context);

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
            content: '你是一位专业的小说作家,擅长分析和规划故事情节。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
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

    // 解析timeline
    const timeline = parseTimeline(rawContent);

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error('Generate timeline error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 构建Timeline生成 Prompt
 */
function buildTimelinePrompt(context: any): string {
  const parts: string[] = [];

  // 参考章节
  if (context.referenceChapters && context.referenceChapters.length > 0) {
    parts.push(`## 参考章节`);
    parts.push(`以下是已完成的章节内容,请参考其风格和情节:`);
    parts.push('');
    context.referenceChapters.forEach((chapter: any) => {
      parts.push(`### ${chapter.volumeId} > ${chapter.chapterId} > ${chapter.sectionId} - ${chapter.title}`);
      if (chapter.content) {
        // 只显示前500字作为参考
        const preview = chapter.content.substring(0, 500);
        parts.push(preview + (chapter.content.length > 500 ? '...' : ''));
      }
      parts.push('');
    });
  }

  // 章节信息
  if (context.chapterInfo) {
    parts.push(`## 章节信息`);
    parts.push(`${context.chapterInfo.volume} > ${context.chapterInfo.chapter} > ${context.chapterInfo.section}`);
    parts.push(`标题: ${context.chapterInfo.title}`);
    parts.push('');
  }

  // 人物信息
  if (context.selectedCharacters && context.selectedCharacters.length > 0) {
    parts.push(`## 人物信息`);
    context.selectedCharacters.forEach((char: any) => {
      parts.push(`### ${char.name}`);
      if (char.basicInfo?.age) parts.push(`- 年龄: ${char.basicInfo.age}`);
      if (char.basicInfo?.gender) parts.push(`- 性别: ${char.basicInfo.gender}`);
      if (char.basicInfo?.occupation) parts.push(`- 职业: ${char.basicInfo.occupation}`);
      if (char.basicInfo?.description) parts.push(`- 描述: ${char.basicInfo.description}`);
      parts.push('');
    });
  }

  // 地点信息
  if (context.selectedLocations && context.selectedLocations.length > 0) {
    parts.push(`## 地点信息`);
    context.selectedLocations.forEach((loc: any) => {
      parts.push(`### ${loc.name}`);
      if (loc.type) parts.push(`- 类型: ${loc.type}`);
      if (loc.description) parts.push(`- 描述: ${loc.description}`);
      parts.push('');
    });
  }

  // 情节概括
  if (context.plotSummary) {
    parts.push(`## 情节概括`);
    parts.push(context.plotSummary);
    parts.push('');
  }

  // 全局要求
  if (context.globalPrompt) {
    parts.push(`## 写作要求`);
    parts.push(context.globalPrompt);
    parts.push('');
  }

  // 章节要求
  if (context.chapterPrompt) {
    parts.push(`## 本章节特殊要求`);
    parts.push(context.chapterPrompt);
    parts.push('');
  }

  parts.push(`## 任务`);
  parts.push(`请根据以上信息,为这一章节生成剧情发展时间线。要求:`);
  parts.push(`1. 清晰地列出本章节的关键剧情节点`);
  parts.push(`2. 每个节点应该简洁明了,说明在这个阶段发生了什么`);
  parts.push(`3. 节点之间应该有逻辑连贯性,体现剧情推进`);
  parts.push(`4. 生成5-10个时间线节点`);
  parts.push('');
  parts.push(`## 输出格式`);
  parts.push(`请按照以下格式输出,每行一个节点:`);
  parts.push('');
  parts.push(`1. [第一个剧情节点的描述]`);
  parts.push(`2. [第二个剧情节点的描述]`);
  parts.push(`3. [第三个剧情节点的描述]`);
  parts.push(`...`);
  parts.push('');
  parts.push(`注意:只输出编号和描述,不要添加其他说明文字。`);

  return parts.join('\n');
}

/**
 * 解析生成的Timeline
 */
function parseTimeline(rawContent: string): Array<{ id: string; order: number; content: string }> {
  const timeline: Array<{ id: string; order: number; content: string }> = [];
  const lines = rawContent.split('\n');

  lines.forEach((line, index) => {
    // 匹配 "1. xxx" 或 "1、xxx" 格式
    const match = line.match(/^\s*\d+[.、]\s*(.+)$/);
    if (match) {
      timeline.push({
        id: `timeline-${Date.now()}-${index}`,
        order: timeline.length + 1,
        content: match[1].trim()
      });
    }
  });

  return timeline;
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

