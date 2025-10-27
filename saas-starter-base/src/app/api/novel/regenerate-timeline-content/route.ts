import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface TimelineItem {
  id: string;
  order: number;
  content: string;
  modificationSuggestion?: string;
  isReviewed?: boolean;
}

interface RegenerateTimelineContentRequest {
  currentContent: string; // 当前章节已有的内容
  timeline: TimelineItem[]; // 完整的timeline
  targetItem: TimelineItem; // 要重新生成内容的timeline节点
  targetIndex: number; // 节点在timeline中的索引
  chapterInfo?: {
    volume?: string;
    chapter?: string;
    section?: string;
    title?: string;
  };
  context?: {
    selectedCharacters?: any[];
    selectedLocations?: any[];
    selectedPrompts?: any[];
    selectedSettings?: any[];
    selectedEvents?: any[];
    plotSummary?: string;
    globalPrompt?: string;
    chapterPrompt?: string;
  };
  apiToken: string;
  model?: string;
}

/**
 * 构建重新生成Prompt
 */
function buildRegeneratePrompt(request: RegenerateTimelineContentRequest): string {
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

  // 剧情大纲
  if (request.context?.plotSummary) {
    parts.push(`# 剧情大纲`);
    parts.push(request.context.plotSummary);
    parts.push('');
  }

  // 人物信息
  if (request.context?.selectedCharacters && request.context.selectedCharacters.length > 0) {
    parts.push(`# 人物信息`);
    request.context.selectedCharacters.forEach((char: any) => {
      parts.push(`## ${char.name}`);
      if (char.basicInfo?.description) parts.push(`基本信息: ${char.basicInfo.description}`);
      if (char.appearance?.description) parts.push(`外貌: ${char.appearance.description}`);
      if (char.personality?.description) parts.push(`性格: ${char.personality.description}`);
      if (char.arc?.description) parts.push(`人物弧光: ${char.arc.description}`);
      parts.push('');
    });
  }

  // 地点信息
  if (request.context?.selectedLocations && request.context.selectedLocations.length > 0) {
    parts.push(`# 地点信息`);
    request.context.selectedLocations.forEach((loc: any) => {
      parts.push(`## ${loc.name}`);
      if (loc.description) parts.push(loc.description);
      parts.push('');
    });
  }

  // 设定信息
  if (request.context?.selectedSettings && request.context.selectedSettings.length > 0) {
    parts.push(`# 世界设定`);
    request.context.selectedSettings.forEach((setting: any) => {
      parts.push(`## ${setting.name}`);
      if (setting.description) parts.push(setting.description);
      parts.push('');
    });
  }

  // 全局要求
  if (request.context?.globalPrompt) {
    parts.push(`# 写作要求`);
    parts.push(request.context.globalPrompt);
    parts.push('');
  }

  // 章节要求
  if (request.context?.chapterPrompt) {
    parts.push(`# 本章节特殊要求`);
    parts.push(request.context.chapterPrompt);
    parts.push('');
  }

  // 时间线上下文
  parts.push(`# 剧情时间线`);
  parts.push(`以下是本章节的完整剧情时间线，请确保生成的内容与整体剧情连贯：`);
  parts.push('');
  request.timeline.forEach((item, index) => {
    const marker = index === request.targetIndex ? '【当前节点】' : '';
    parts.push(`${item.order}. ${item.content} ${marker}`);
  });
  parts.push('');

  // 当前已有内容
  if (request.currentContent && request.currentContent.trim()) {
    parts.push(`# 当前章节已有内容`);
    parts.push(`以下是本章节目前已经写好的内容，请参考其风格和情节连贯性：`);
    parts.push('');
    parts.push(request.currentContent);
    parts.push('');
  }

  // 当前节点信息和修改建议
  parts.push(`# 重新生成任务`);
  parts.push(`请为以下时间线节点重新生成内容：`);
  parts.push('');
  parts.push(`**节点内容**: ${request.targetItem.content}`);
  parts.push('');

  // 如果有修改建议，添加到prompt中
  if (request.targetItem.modificationSuggestion) {
    parts.push(`**修改建议**: ${request.targetItem.modificationSuggestion}`);
    parts.push('');
    parts.push(`请根据以上修改建议，重新生成这个节点对应的段落内容。`);
  } else {
    parts.push(`请重新生成这个节点对应的段落内容。`);
  }

  parts.push('');
  parts.push(`## 要求`);
  parts.push(`1. 生成的内容应该是一个完整的段落或多个段落`);
  parts.push(`2. 内容应该与时间线节点的描述相符`);
  if (request.targetItem.modificationSuggestion) {
    parts.push(`3. 必须充分考虑并应用修改建议中的要求`);
  }
  parts.push(`${request.targetItem.modificationSuggestion ? '4' : '3'}. 保持与已有内容的风格一致`);
  parts.push(`${request.targetItem.modificationSuggestion ? '5' : '4'}. 确保与前后剧情的连贯性`);
  parts.push(`${request.targetItem.modificationSuggestion ? '6' : '5'}. 直接输出段落内容，不要添加任何说明文字`);

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
    temperature: 0.8,
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
  const promises = Array(count).fill(null).map(() => 
    generateContent(prompt, apiToken, model)
  );
  
  return Promise.all(promises);
}

export async function POST(request: NextRequest) {
  try {
    const body: RegenerateTimelineContentRequest = await request.json();

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
    const prompt = buildRegeneratePrompt(body);

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
    console.error('Error regenerating timeline content:', error);
    return NextResponse.json(
      {
        error: 'Failed to regenerate timeline content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

