import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { features, featureVotes, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { adminMiddleware } from '@/lib/auth/admin';

// 获取功能的所有投票
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const { id } = await params;

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

    // 获取投票详情
    const votes = await db
      .select({
        id: featureVotes.id,
        voteType: featureVotes.voteType,
        createdAt: featureVotes.createdAt,
        updatedAt: featureVotes.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          planName: users.planName,
        }
      })
      .from(featureVotes)
      .leftJoin(users, eq(featureVotes.userId, users.id))
      .where(eq(featureVotes.featureId, id))
      .orderBy(featureVotes.createdAt);

    return NextResponse.json({
      success: true,
      data: {
        feature,
        votes
      }
    });

  } catch (error) {
    console.error('获取投票信息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取投票信息失败' },
      { status: 500 }
    );
  }
}

// 删除特定投票
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const voteId = searchParams.get('voteId');

    if (!voteId) {
      return NextResponse.json(
        { success: false, error: '缺少投票ID' },
        { status: 400 }
      );
    }

    // 验证投票是否存在且属于该功能
    const vote = await db
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

    if (!vote) {
      return NextResponse.json(
        { success: false, error: '投票不存在' },
        { status: 404 }
      );
    }

    // 删除投票
    await db.delete(featureVotes).where(eq(featureVotes.id, voteId));

    return NextResponse.json({
      success: true,
      message: '投票删除成功'
    });

  } catch (error) {
    console.error('删除投票失败:', error);
    return NextResponse.json(
      { success: false, error: '删除投票失败' },
      { status: 500 }
    );
  }
}
