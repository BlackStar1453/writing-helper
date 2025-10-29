/**
 * 段落重写 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { NovelContext, Character, Location, SettingCard, PromptCard } from '@/lib/novel/types';

interface RewriteRequest {
  selectedText: string;           // 选中的文本
  contextBefore: string;          // 前文上下文
  contextAfter: string;           // 后文上下文
  rewriteStyle?: 'vivid' | 'concise' | 'formal' | 'casual' | 'emotional' | 'character-based';
  selectedCharacters: Character[];
  selectedLocations: Location[];
  selectedSettings: SettingCard[];
  selectedPrompts: PromptCard[];  // 新增: 选中的Prompt卡片
  customPrompt?: string;
  novelContext: NovelContext;
  apiToken: string;
  model: string;
}

interface RewriteResponse {
  candidates: Array<{
    version: number;
    content: string;
    description: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const requestData: RewriteRequest = await request.json();

    if (!requestData.apiToken) {
      return NextResponse.json(
        { error: 'Missing API token' },
        { status: 400 }
      );
    }

    // 构建Prompt
    const prompt = buildRewritePrompt(requestData);

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
            content: '你是一位专业的小说作家，擅长改写和优化文本。'
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
    const candidates = parseRewriteResponse(rawContent);

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Rewrite paragraph error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 构建重写Prompt
 */
function buildRewritePrompt(request: RewriteRequest): string {
  const parts = [];

  parts.push('你是一位专业的小说作家，擅长改写和优化文本。');
  parts.push('');

  // 添加章节信息
  if (request.novelContext.chapterInfo) {
    const { volume, chapter, section, title } = request.novelContext.chapterInfo;
    parts.push(`**章节信息**: ${volume} > ${chapter} > ${section}`);
    parts.push(`**章节标题**: ${title}`);
    parts.push('');
  }

  // 添加人物信息
  if (request.selectedCharacters && request.selectedCharacters.length > 0) {
    parts.push('**相关人物**:');
    request.selectedCharacters.forEach(char => {
      parts.push(`- ${char.name}: ${char.basicInfo?.description || ''}`);
      if (char.basicInfo?.personality) parts.push(`  性格: ${char.basicInfo.personality}`);
      if (char.basicInfo?.appearance) parts.push(`  外貌: ${char.basicInfo.appearance}`);
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

  // 添加上下文
  if (request.contextBefore && request.contextBefore.trim()) {
    parts.push('**前文**:');
    parts.push(request.contextBefore);
    parts.push('');
  }

  parts.push('**需要重写的段落**:');
  parts.push(request.selectedText);
  parts.push('');

  if (request.contextAfter && request.contextAfter.trim()) {
    parts.push('**后文**:');
    parts.push(request.contextAfter);
    parts.push('');
  }

  // 添加重写要求
  parts.push('**重写要求**:');

  // 如果选择了Prompt卡片,使用Prompt卡片的描述
  if (request.selectedPrompts && request.selectedPrompts.length > 0) {
    parts.push('1. 重写风格:');
    request.selectedPrompts.forEach((prompt, index) => {
      parts.push(`   ${index + 1}. ${prompt.name}: ${prompt.description}`);
      if (prompt.exampleBefore) {
        parts.push(`      示例: ${prompt.exampleBefore}`);
      }
    });
  } else {
    // 如果没有选择Prompt卡片,使用与上下文统一的语言风格
    if (request.rewriteStyle) {
      const styleInstructions = {
        vivid: '使用更生动的描写，增加细节、感官体验和情感表达',
        concise: '精简表达，去除冗余，保留核心内容',
        formal: '使用书面语，提升文学性和正式程度',
        casual: '使用口语化表达，更自然流畅',
        emotional: '增强情感表达，突出人物内心活动',
        'character-based': '严格遵循人物性格特点，确保言行举止符合人设'
      };
      parts.push(`1. 重写风格: ${styleInstructions[request.rewriteStyle]}`);
    } else {
      parts.push('1. 重写风格: 保持与上下文统一的语言风格和表达方式');
    }
  }

  parts.push('2. 保持原文的核心意思和情节发展');
  parts.push('3. 与前后文自然衔接');
  parts.push('4. **只重写"需要重写的段落"部分，不要重写前文和后文**');
  parts.push('5. 生成3个不同的重写版本');
  parts.push('');

  // 添加自定义提示词
  if (request.customPrompt && request.customPrompt.trim()) {
    parts.push('**额外要求**:');
    parts.push(request.customPrompt);
    parts.push('');
  }

  parts.push('**重要提示**: 前文和后文仅供参考上下文，你只需要重写"需要重写的段落"部分。');
  parts.push('请直接输出重写后的内容，不要包含任何解释或标记。');
  parts.push('格式：');
  parts.push('【版本1】');
  parts.push('[重写内容]');
  parts.push('');
  parts.push('【版本2】');
  parts.push('[重写内容]');
  parts.push('');
  parts.push('【版本3】');
  parts.push('[重写内容]');

  return parts.join('\n');
}

/**
 * 解析AI返回的重写内容
 */
function parseRewriteResponse(rawContent: string): Array<{ version: number; content: string; description: string }> {
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

