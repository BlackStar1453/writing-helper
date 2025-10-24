import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '../../../../../lib/auth/admin';
import { db } from '../../../../../lib/db/drizzle';
import { sharePlatforms } from '../../../../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const platforms = await db
      .select()
      .from(sharePlatforms)
      .orderBy(asc(sharePlatforms.sortOrder), asc(sharePlatforms.createdAt));

    return NextResponse.json(platforms);
  } catch (error) {
    console.error('获取社交平台配置失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const data = await request.json();

    // 验证必需字段
    if (!data.platformId || !data.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 验证奖励类型
    if (data.rewardType && !['fast', 'premium'].includes(data.rewardType)) {
      return NextResponse.json({ error: 'Invalid reward type' }, { status: 400 });
    }

    // 验证奖励数量
    if (data.rewardAmount !== undefined && data.rewardAmount <= 0) {
      return NextResponse.json({ error: 'Reward amount must be positive' }, { status: 400 });
    }

    const newPlatform = await db
      .insert(sharePlatforms)
      .values({
        platformId: data.platformId,
        name: data.name,
        description: data.description || null,
        rewardAmount: data.rewardAmount || 100,
        rewardType: data.rewardType || 'fast',
        shareUrl: data.shareUrl || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        sortOrder: data.sortOrder || 0,
      })
      .returning();

    return NextResponse.json(newPlatform[0]);
  } catch (error) {
    console.error('创建社交平台配置失败:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'Platform ID already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
