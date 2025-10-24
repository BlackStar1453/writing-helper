import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '../../../../../../lib/auth/admin';
import { db } from '../../../../../../lib/db/drizzle';
import { sharePlatforms } from '../../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const platform = await db
      .select()
      .from(sharePlatforms)
      .where(eq(sharePlatforms.id, id))
      .limit(1);

    if (platform.length === 0) {
      return NextResponse.json({ error: 'Share platform not found' }, { status: 404 });
    }

    return NextResponse.json(platform[0]);
  } catch (error) {
    console.error('获取社交平台配置失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const data = await request.json();

    // 验证奖励类型（如果提供）
    if (data.rewardType && !['fast', 'premium'].includes(data.rewardType)) {
      return NextResponse.json({ error: 'Invalid reward type' }, { status: 400 });
    }

    // 验证奖励数量（如果提供）
    if (data.rewardAmount !== undefined && data.rewardAmount <= 0) {
      return NextResponse.json({ error: 'Reward amount must be positive' }, { status: 400 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    // 只更新提供的字段
    if (data.platformId !== undefined) updateData.platformId = data.platformId;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.rewardAmount !== undefined) updateData.rewardAmount = data.rewardAmount;
    if (data.rewardType !== undefined) updateData.rewardType = data.rewardType;
    if (data.shareUrl !== undefined) updateData.shareUrl = data.shareUrl;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const updatedPlatform = await db
      .update(sharePlatforms)
      .set(updateData)
      .where(eq(sharePlatforms.id, id))
      .returning();

    if (updatedPlatform.length === 0) {
      return NextResponse.json({ error: 'Share platform not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPlatform[0]);
  } catch (error) {
    console.error('更新社交平台配置失败:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'Platform ID already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userOrError = await adminMiddleware();

    if (userOrError instanceof Response) {
      return userOrError;
    }

    const deletedPlatform = await db
      .delete(sharePlatforms)
      .where(eq(sharePlatforms.id, id))
      .returning();

    if (deletedPlatform.length === 0) {
      return NextResponse.json({ error: 'Share platform not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Share platform deleted successfully' });
  } catch (error) {
    console.error('删除社交平台配置失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
