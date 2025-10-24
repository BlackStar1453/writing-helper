import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { features, featureVotes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { adminMiddleware } from '@/lib/auth/admin';

// 更新功能
export async function PUT(
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
    const body = await request.json();
    const { title, description, status, priority, version, completedAt, estimatedCompletionDate } = body;

    // 验证功能是否存在
    const existingFeature = await db
      .select()
      .from(features)
      .where(eq(features.id, id))
      .limit(1)
      .then(rows => rows[0]);

    if (!existingFeature) {
      return NextResponse.json(
        { success: false, error: '功能不存在' },
        { status: 404 }
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

    // 更新功能
    const updatedFeature = await db
      .update(features)
      .set({
        title: title || existingFeature.title,
        description: description || existingFeature.description,
        status: status || existingFeature.status,
        priority: priority !== undefined ? priority : existingFeature.priority,
        version: version !== undefined ? version : existingFeature.version,
        completedAt: completedAt !== undefined ? (completedAt ? new Date(completedAt) : null) : existingFeature.completedAt,
        estimatedCompletionDate: estimatedCompletionDate !== undefined ? (estimatedCompletionDate ? new Date(estimatedCompletionDate) : null) : existingFeature.estimatedCompletionDate,
        updatedAt: new Date(),
      })
      .where(eq(features.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedFeature[0],
      message: '功能更新成功'
    });

  } catch (error) {
    console.error('更新功能失败:', error);
    return NextResponse.json(
      { success: false, error: '更新功能失败' },
      { status: 500 }
    );
  }
}

// 删除功能
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

    // 验证功能是否存在
    const existingFeature = await db
      .select()
      .from(features)
      .where(eq(features.id, id))
      .limit(1)
      .then(rows => rows[0]);

    if (!existingFeature) {
      return NextResponse.json(
        { success: false, error: '功能不存在' },
        { status: 404 }
      );
    }

    // 删除功能（会自动删除相关的投票记录，因为有外键约束）
    await db.delete(features).where(eq(features.id, id));

    return NextResponse.json({
      success: true,
      message: '功能删除成功'
    });

  } catch (error) {
    console.error('删除功能失败:', error);
    return NextResponse.json(
      { success: false, error: '删除功能失败' },
      { status: 500 }
    );
  }
}
