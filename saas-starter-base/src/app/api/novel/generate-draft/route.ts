/**
 * 生成小说初稿 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { NovelContext } from '@/lib/novel/types';
import { buildNovelPrompt } from '@/lib/novel/prompt-builder';

export async function POST(request: NextRequest) {
  try {
    const { context, apiToken, model, customPrompt } = await request.json();

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

    // 构建 Prompt - 如果有自定义prompt则使用自定义的,否则自动构建
    const prompt = customPrompt || buildNovelPrompt(context);

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

