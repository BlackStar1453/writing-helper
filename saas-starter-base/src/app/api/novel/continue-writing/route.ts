/**
 * 智能续写 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { NovelContext, ChapterTimelineItem, Character, Location, Setting } from '@/lib/novel/types';

interface ContinueWritingRequest {
  selectedText: string;           // 选中的文本（光标前的文本）
  contextBefore: string;          // 光标前的上下文
  contextAfter: string;           // 光标后的上下文
  length: 'short' | 'medium' | 'long';  // 续写长度
  selectedCharacters: Character[];
  selectedLocations: Location[];
  selectedSettings: Setting[];
  useTimeline: boolean;
  currentTimelineNode?: ChapterTimelineItem;
  customPrompt?: string;
  novelContext: NovelContext;
  apiToken: string;
  model: string;
}

interface ContinueWritingResponse {
  candidates: Array<{
    version: number;
    content: string;
    description: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const requestData: ContinueWritingRequest = await request.json();

    if (!requestData.apiToken) {
      return NextResponse.json(
        { error: 'Missing API token' },
        { status: 400 }
      );
    }

    // 构建Prompt
    const prompt = buildContinueWritingPrompt(requestData);

    // 调用AI API
    const aiModel = requestData.model || 'deepseek-chat';
    const apiUrl = getApiUrl(aiModel);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${requestData.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的小说作家，擅长创作引人入胜的故事。你的任务是根据用户提供的"选中的文本"作为续写起点，在该文本之后进行续写，而不是在整个章节的末尾续写。请仔细阅读选中的文本和上下文，确保续写内容紧接在选中文本之后。'
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

    // 解析候选版本
    const candidates = parseContinueWritingResponse(rawContent);

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Continue writing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 构建续写Prompt
 */
function buildContinueWritingPrompt(request: ContinueWritingRequest): string {
  const parts = [];

  parts.push('你是一位专业的小说作家，擅长创作引人入胜的故事。');
  parts.push('');

  // 添加章节信息
  if (request.novelContext.chapterInfo) {
    const { volume, chapter, section, title } = request.novelContext.chapterInfo;
    parts.push(`**章节信息**: ${volume} > ${chapter} > ${section}`);
    parts.push(`**章节标题**: ${title}`);
    parts.push('');
  }

  // 添加剧情摘要
  if (request.novelContext.plotSummary) {
    parts.push(`**剧情摘要**: ${request.novelContext.plotSummary}`);
    parts.push('');
  }

  // 添加人物信息
  if (request.selectedCharacters && request.selectedCharacters.length > 0) {
    parts.push('**相关人物**:');
    request.selectedCharacters.forEach(char => {
      parts.push(`- ${char.name}: ${char.basicInfo || char.description || ''}`);
      if (char.personality) parts.push(`  性格: ${char.personality}`);
      if (char.appearance) parts.push(`  外貌: ${char.appearance}`);
    });
    parts.push('');
  }

  // 添加地点信息
  if (request.selectedLocations && request.selectedLocations.length > 0) {
    parts.push('**相关地点**:');
    request.selectedLocations.forEach(loc => {
      parts.push(`- ${loc.name}: ${loc.description || ''}`);
    });
    parts.push('');
  }

  // 添加设定信息
  if (request.selectedSettings && request.selectedSettings.length > 0) {
    parts.push('**世界设定**:');
    request.selectedSettings.forEach(setting => {
      parts.push(`- ${setting.name}: ${setting.description || ''}`);
    });
    parts.push('');
  }

  // 添加Timeline节点信息
  if (request.useTimeline && request.currentTimelineNode) {
    parts.push(`**当前剧情节点**: ${request.currentTimelineNode.content}`);
    parts.push('');
  }

  // 添加上下文
  if (request.contextBefore && request.contextBefore.trim()) {
    parts.push('**前文上下文**:');
    parts.push(request.contextBefore);
    parts.push('');
  }

  parts.push('**选中的文本(续写起点)**:');
  parts.push(request.selectedText);
  parts.push('');
  parts.push('[在此处续写]');
  parts.push('');

  if (request.contextAfter && request.contextAfter.trim()) {
    parts.push('**后文上下文**:');
    parts.push(request.contextAfter);
    parts.push('');
  }

  // 添加续写要求
  const lengthMap = {
    short: '100-200字',
    medium: '200-500字',
    long: '500-1000字'
  };

  parts.push('**续写要求**:');
  parts.push(`1. 续写长度: ${lengthMap[request.length]}`);
  parts.push('2. **重要**: 请在"选中的文本"之后进行续写,而不是在整个章节之后');
  parts.push('3. 保持人物性格一致');
  parts.push('4. 情节自然流畅，与前后文衔接');
  parts.push('5. 生成3个不同的续写版本，每个版本风格略有差异');
  parts.push('');

  // 添加自定义提示词
  if (request.customPrompt && request.customPrompt.trim()) {
    parts.push('**额外要求**:');
    parts.push(request.customPrompt);
    parts.push('');
  }

  parts.push('请直接输出续写内容，不要包含任何解释或标记。');
  parts.push('格式：');
  parts.push('【版本1】');
  parts.push('[续写内容]');
  parts.push('');
  parts.push('【版本2】');
  parts.push('[续写内容]');
  parts.push('');
  parts.push('【版本3】');
  parts.push('[续写内容]');

  return parts.join('\n');
}

/**
 * 解析AI返回的续写内容
 */
function parseContinueWritingResponse(rawContent: string): Array<{ version: number; content: string; description: string }> {
  const candidates = [];

  // 使用正则提取版本
  const versionRegex = /【版本(\d+)】\s*([\s\S]*?)(?=【版本\d+】|$)/g;
  let match;
  let versionNum = 1;

  while ((match = versionRegex.exec(rawContent)) !== null) {
    const content = match[2].trim();
    if (content) {
      candidates.push({
        version: versionNum,
        content: content,
        description: `版本${versionNum}`
      });
      versionNum++;
    }
  }

  // 如果没有匹配到版本标记，尝试按段落分割
  if (candidates.length === 0) {
    const paragraphs = rawContent.split(/\n\n+/).filter(p => p.trim());
    paragraphs.slice(0, 3).forEach((p, i) => {
      candidates.push({
        version: i + 1,
        content: p.trim(),
        description: `版本${i + 1}`
      });
    });
  }

  // 确保至少有一个候选版本
  if (candidates.length === 0) {
    candidates.push({
      version: 1,
      content: rawContent.trim(),
      description: '版本1'
    });
  }

  return candidates;
}

/**
 * 获取API URL
 */
function getApiUrl(model: string): string {
  if (model.startsWith('gpt-') || model.startsWith('o1-')) {
    return 'https://api.openai.com/v1/chat/completions';
  }
  return 'https://api.deepseek.com/v1/chat/completions';
}

