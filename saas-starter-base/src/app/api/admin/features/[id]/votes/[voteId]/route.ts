import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { features, featureVotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { adminMiddleware } from '@/lib/auth/admin';

// 更新投票
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; voteId: string }> }
) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const { id, voteId } = await params;
    const body = await request.json();
    const { voteType } = body;

    // 验证投票类型
    if (voteType !== 'like' && voteType !== 'dislike') {
      return NextResponse.json(
        { success: false, error: '无效的投票类型' },
        { status: 400 }
      );
    }

    // 验证功能是否存在
    const feature = await db
      .select()
      .from(features)
      .where(eq(features.id, id))
      .limit(1)
      .then(rows => rows[0]);

    if (!feature) {
      return NextResponse.json(
        { success: false, error: '功能不存在' },
        { status: 404 }
      );
    }

    // 验证投票是否存在且属于该功能
    const existingVote = await db
      .select()
      .from(featureVotes)
      .where(
        and(
          eq(featureVotes.id, voteId),
          eq(featureVotes.featureId, id)
        )
      )
      .limit(1)
      .then(rows => rows[0]);

    if (!existingVote) {
      return NextResponse.json(
        { success: false, error: '投票不存在' },
        { status: 404 }
      );
    }

    // 更新投票
    const updatedVote = await db
      .update(featureVotes)
      .set({
        voteType,
        updatedAt: new Date(),
      })
      .where(eq(featureVotes.id, voteId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedVote[0],
      message: '投票更新成功'
    });

  } catch (error) {
    console.error('更新投票失败:', error);
    return NextResponse.json(
      { success: false, error: '更新投票失败' },
      { status: 500 }
    );
  }
}
