import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { features, featureVotes } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { adminMiddleware } from '@/lib/auth/admin';

// 获取所有功能（管理员视图）
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    // 获取所有功能，包括投票统计
    const featuresWithVotes = await db
      .select({
        id: features.id,
        title: features.title,
        description: features.description,
        status: features.status,
        priority: features.priority,
        version: features.version,
        completedAt: features.completedAt,
        createdAt: features.createdAt,
        updatedAt: features.updatedAt,
        likesCount: sql<number>`COALESCE(COUNT(CASE WHEN ${featureVotes.voteType} = 'like' THEN 1 END), 0)`,
        dislikesCount: sql<number>`COALESCE(COUNT(CASE WHEN ${featureVotes.voteType} = 'dislike' THEN 1 END), 0)`,
      })
      .from(features)
      .leftJoin(featureVotes, eq(features.id, featureVotes.featureId))
      .groupBy(features.id)
      .orderBy(desc(features.createdAt));

    return NextResponse.json({
      success: true,
      data: featuresWithVotes
    });

  } catch (error) {
    console.error('获取功能列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取功能列表失败' },
      { status: 500 }
    );
  }
}

// 创建新功能
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const body = await request.json();
    const { title, description, status, priority, version, completedAt, estimatedCompletionDate } = body;

    // 验证必要字段
    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: '标题和描述是必填字段' },
        { status: 400 }
      );
    }

    // 验证状态值
    const validStatuses = ['planned', 'inDevelopment', 'completed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: '无效的状态值' },
        { status: 400 }
      );
    }

    // 创建功能
    const newFeature = await db.insert(features).values({
      title,
      description,
      status: status || 'planned',
      priority: priority || 0,
      version: version || null,
      completedAt: completedAt ? new Date(completedAt) : null,
      estimatedCompletionDate: estimatedCompletionDate ? new Date(estimatedCompletionDate) : null,
    }).returning();

    return NextResponse.json({
      success: true,
      data: newFeature[0],
      message: '功能创建成功'
    });

  } catch (error) {
    console.error('创建功能失败:', error);
    return NextResponse.json(
      { success: false, error: '创建功能失败' },
      { status: 500 }
    );
  }
}
