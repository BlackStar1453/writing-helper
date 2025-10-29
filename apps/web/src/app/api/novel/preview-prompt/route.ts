/**
 * 预览生成初稿的Prompt API
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildNovelPrompt } from '@/lib/novel/prompt-builder';

export async function POST(request: NextRequest) {
  try {
    const { context } = await request.json();

    if (!context) {
      return NextResponse.json(
        { error: 'Missing context' },
        { status: 400 }
      );
    }

    // 构建 Prompt
    const prompt = buildNovelPrompt(context);

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Preview prompt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

