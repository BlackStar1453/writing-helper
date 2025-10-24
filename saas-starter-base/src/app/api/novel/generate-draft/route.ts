/**
 * 生成小说初稿 API
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
    const prompt = buildNovelPrompt(context);

    // 调用 DeepSeek API (或用户指定的模型)
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
            content: '你是一位专业的小说作家,擅长创作引人入胜的故事。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
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

    // 解析timeline和content
    const { timeline, content: parsedContent } = parseGeneratedContent(rawContent);

    // 如果有timeline,为内容添加标记
    let finalContent = parsedContent;
    if (context.timeline && context.timeline.length > 0) {
      finalContent = addTimelineMarkersToContent(parsedContent, context.timeline);
    }

    return NextResponse.json({ content: finalContent, timeline });
  } catch (error) {
    console.error('Generate draft error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 为生成的内容添加timeline标记
 * 将内容按timeline节点数量分段,并为每段添加标记
 */
function addTimelineMarkersToContent(content: string, timeline: Array<{ id: string; order: number; content: string }>): string {
  if (!timeline || timeline.length === 0) {
    return content;
  }

  // 将内容按段落分割
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  if (paragraphs.length === 0) {
    return content;
  }

  // 计算每个timeline节点应该对应多少段落
  const paragraphsPerNode = Math.max(1, Math.floor(paragraphs.length / timeline.length));

  const markedParagraphs: string[] = [];
  let currentParagraphIndex = 0;

  timeline.forEach((item, index) => {
    // 计算这个节点应该包含多少段落
    let nodeParagraphCount = paragraphsPerNode;

    // 最后一个节点包含所有剩余段落
    if (index === timeline.length - 1) {
      nodeParagraphCount = paragraphs.length - currentParagraphIndex;
    }

    // 添加开始标记
    markedParagraphs.push(`<!-- TIMELINE_NODE:${item.id} -->`);

    // 添加这个节点对应的段落
    for (let i = 0; i < nodeParagraphCount && currentParagraphIndex < paragraphs.length; i++) {
      markedParagraphs.push(paragraphs[currentParagraphIndex]);
      currentParagraphIndex++;
    }

    // 添加结束标记
    markedParagraphs.push(`<!-- /TIMELINE_NODE -->`);
  });

  return markedParagraphs.join('\n\n');
}

/**
 * 解析生成的内容,提取timeline和content
 */
function parseGeneratedContent(rawContent: string): { timeline: Array<{ id: string; order: number; content: string }>; content: string } {
  const timeline: Array<{ id: string; order: number; content: string }> = [];
  let content = rawContent;

  // 检查是否有标签格式
  const hasTimelineTag = rawContent.includes('<TIMELINE>');
  const hasContentTag = rawContent.includes('<CONTENT>');

  if (hasTimelineTag || hasContentTag) {
    // 提取TIMELINE部分
    const timelineMatch = rawContent.match(/<TIMELINE>([\s\S]*?)<\/TIMELINE>/);
    if (timelineMatch) {
      const timelineText = timelineMatch[1].trim();
      const lines = timelineText.split('\n');

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
    }

    // 提取CONTENT部分
    const contentMatch = rawContent.match(/<CONTENT>([\s\S]*?)<\/CONTENT>/);
    if (contentMatch) {
      content = contentMatch[1].trim();
    }
  } else {
    // 没有标签,直接使用原始内容作为正文
    content = rawContent.trim();
  }

  return { timeline, content };
}

/**
 * 构建小说创作 Prompt
 */
function buildNovelPrompt(context: any): string {
  const parts: string[] = [];

  // 参考章节
  if (context.referenceChapters && context.referenceChapters.length > 0) {
    parts.push(`## 参考章节`);
    parts.push(`以下是已完成的章节内容,请参考其风格和情节连贯性:`);
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

      // 添加时间线信息
      if (char.timeline && char.timeline.length > 0) {
        parts.push(`- 重要事件:`);
        char.timeline.slice(0, 3).forEach((event: any) => {
          parts.push(`  * ${event.date}: ${event.title}`);
        });
      }
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

  // 剧情时间线
  if (context.timeline && context.timeline.length > 0) {
    parts.push(`## 剧情时间线`);
    parts.push(`请按照以下时间线节点展开创作:`);
    parts.push('');
    context.timeline.forEach((item: any) => {
      parts.push(`${item.order}. ${item.content}`);
    });
    parts.push('');
  }

  parts.push(`## 任务`);
  parts.push(`请根据以上信息,创作这一章节的内容。要求:`);
  parts.push(`1. 内容要符合人物性格和背景`);
  parts.push(`2. 场景描写要生动具体`);
  parts.push(`3. 情节推进要自然流畅`);
  if (context.timeline && context.timeline.length > 0) {
    parts.push(`4. 严格按照剧情时间线展开创作,确保每个节点都有对应的内容`);
  }
  if (context.referenceChapters && context.referenceChapters.length > 0) {
    parts.push(`${context.timeline && context.timeline.length > 0 ? '5' : '4'}. 保持与参考章节的风格一致性和情节连贯性`);
    parts.push(`${context.timeline && context.timeline.length > 0 ? '6' : '5'}. 字数控制在800-1500字左右`);
  } else {
    parts.push(`${context.timeline && context.timeline.length > 0 ? '5' : '4'}. 字数控制在800-1500字左右`);
  }
  parts.push('');

  // 如果有timeline,只要求输出正文;否则要求输出timeline和正文
  if (context.timeline && context.timeline.length > 0) {
    parts.push(`## 输出格式`);
    parts.push(`直接输出章节正文内容即可,不需要任何标签或格式。`);
  } else {
    parts.push(`## 输出格式`);
    parts.push(`请按照以下格式输出:`);
    parts.push('');
    parts.push(`<TIMELINE>`);
    parts.push(`1. [第一个剧情节点的描述]`);
    parts.push(`2. [第二个剧情节点的描述]`);
    parts.push(`3. [第三个剧情节点的描述]`);
    parts.push(`...`);
    parts.push(`</TIMELINE>`);
    parts.push('');
    parts.push(`<CONTENT>`);
    parts.push(`[章节正文内容]`);
    parts.push(`</CONTENT>`);
    parts.push('');
    parts.push(`说明:`);
    parts.push(`- TIMELINE部分列出本章节的剧情发展时间线,每个节点用序号标注`);
    parts.push(`- CONTENT部分是完整的章节正文`);
    parts.push(`- 时间线应该清晰地表明在不同阶段发生了什么,以及剧情是如何推进的`);
  }

  return parts.join('\n');
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

