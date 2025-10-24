/**
 * API路由: 为Timeline节点生成对应的内容
 * 
 * 根据当前章节内容、整个timeline、以及当前节点的位置和描述,
 * 生成该节点对应的情节内容
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface TimelineItem {
  id: string;
  order: number;
  content: string;
}

interface GenerateTimelineContentRequest {
  currentContent: string; // 当前章节已有的内容
  timeline: TimelineItem[]; // 完整的timeline
  targetItem: TimelineItem; // 要生成内容的timeline节点
  targetIndex: number; // 节点在timeline中的索引
  chapterInfo?: {
    volume?: string;
    chapter?: string;
    section?: string;
    title?: string;
  };
  apiToken: string;
  model?: string;
}

/**
 * 构建生成Prompt
 */
function buildPrompt(request: GenerateTimelineContentRequest): string {
  const parts: string[] = [];

  // 章节信息
  if (request.chapterInfo) {
    parts.push(`# 章节信息`);
    if (request.chapterInfo.volume) parts.push(`卷: ${request.chapterInfo.volume}`);
    if (request.chapterInfo.chapter) parts.push(`章: ${request.chapterInfo.chapter}`);
    if (request.chapterInfo.section) parts.push(`节: ${request.chapterInfo.section}`);
    if (request.chapterInfo.title) parts.push(`标题: ${request.chapterInfo.title}`);
    parts.push('');
  }

  // 当前章节内容
  if (request.currentContent && request.currentContent.trim()) {
    parts.push(`# 当前章节已有内容`);
    parts.push(request.currentContent);
    parts.push('');
  }

  // 完整的Timeline
  parts.push(`# 完整剧情时间线`);
  request.timeline.forEach((item, index) => {
    const marker = index === request.targetIndex ? '【当前节点】' : '';
    parts.push(`${item.order}. ${item.content} ${marker}`);
  });
  parts.push('');

  // 目标节点信息
  parts.push(`# 当前要生成的节点`);
  parts.push(`节点序号: ${request.targetItem.order}`);
  parts.push(`节点描述: ${request.targetItem.content}`);
  parts.push('');

  // 上下文提示
  parts.push(`# 上下文提示`);
  if (request.targetIndex > 0) {
    parts.push(`前一个节点: ${request.timeline[request.targetIndex - 1].content}`);
  }
  if (request.targetIndex < request.timeline.length - 1) {
    parts.push(`后一个节点: ${request.timeline[request.targetIndex + 1].content}`);
  }
  parts.push('');

  // 任务要求
  parts.push(`# 任务要求`);
  parts.push(`请根据以上信息,为"${request.targetItem.content}"这个剧情节点生成对应的小说内容。`);
  parts.push('');
  parts.push(`要求:`);
  parts.push(`1. 内容要与当前节点的描述完全吻合`);
  parts.push(`2. 如果有已有内容,要与之衔接自然,保持风格一致`);
  parts.push(`3. 要考虑前后节点的剧情发展,确保逻辑连贯`);
  parts.push(`4. 内容长度适中,一般在300-800字之间`);
  parts.push(`5. 直接输出小说正文,不要任何标签或格式说明`);

  return parts.join('\n');
}

/**
 * 调用AI API生成内容
 */
async function generateContent(
  prompt: string,
  apiToken: string,
  model: string = 'deepseek-chat'
): Promise<string> {
  // 使用OpenAI SDK,支持DeepSeek等兼容的API
  const openai = new OpenAI({
    apiKey: apiToken,
    baseURL: model.startsWith('deepseek') ? 'https://api.deepseek.com' : undefined,
  });

  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 2048,
  });

  return completion.choices[0]?.message?.content || '';
}

/**
 * 生成多个候选版本
 */
async function generateMultipleVersions(
  prompt: string,
  apiToken: string,
  model: string = 'deepseek-chat',
  count: number = 3
): Promise<string[]> {
  // 并行生成多个版本
  const promises = Array.from({ length: count }, () =>
    generateContent(prompt, apiToken, model)
  );

  return Promise.all(promises);
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateTimelineContentRequest = await request.json();

    // 验证必需参数
    if (!body.apiToken) {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400 }
      );
    }

    if (!body.timeline || body.timeline.length === 0) {
      return NextResponse.json(
        { error: 'Timeline is required' },
        { status: 400 }
      );
    }

    if (!body.targetItem) {
      return NextResponse.json(
        { error: 'Target timeline item is required' },
        { status: 400 }
      );
    }

    // 构建Prompt
    const prompt = buildPrompt(body);

    // 生成3个候选版本
    const versions = await generateMultipleVersions(
      prompt,
      body.apiToken,
      body.model,
      3
    );

    // 为每个版本添加Timeline标记
    const markedVersions = versions.map((content, index) => ({
      version: index + 1,
      content: `<!-- TIMELINE_NODE:${body.targetItem.id} -->\n${content.trim()}\n<!-- /TIMELINE_NODE -->`
    }));

    // 返回生成的多个版本
    return NextResponse.json({
      versions: markedVersions,
      timelineItemId: body.targetItem.id,
      targetIndex: body.targetIndex,
    });
  } catch (error) {
    console.error('Error generating timeline content:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate timeline content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

