import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAPI } from '@/lib/auth/admin-middleware';
import { db } from '@/lib/db/drizzle';
import { shareRecords, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyShareRecord } from '@/lib/db/queries';
import { unlink } from 'fs/promises';
import { join } from 'path';

// GET - 获取单个转发记录详情（管理员）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const recordId = id;

    const [record] = await db
      .select({
        id: shareRecords.id,
        userId: shareRecords.userId,
        platform: shareRecords.platform,
        imageUrl: shareRecords.imageUrl,
        status: shareRecords.status,
        rewardAmount: shareRecords.rewardAmount,
        rewardType: shareRecords.rewardType,
        submittedAt: shareRecords.submittedAt,
        verifiedAt: shareRecords.verifiedAt,
        scheduledVerifyAt: shareRecords.scheduledVerifyAt,
        createdAt: shareRecords.createdAt,
        updatedAt: shareRecords.updatedAt,
        userEmail: users.email,
        userName: users.name,
        userPlan: users.planName,
        userRole: users.role,
        userFastLimit: users.fastRequestsLimit,
        userFastUsed: users.fastRequestsUsed,
        userPremiumLimit: users.premiumRequestsLimit,
        userPremiumUsed: users.premiumRequestsUsed,
      })
      .from(shareRecords)
      .leftJoin(users, eq(shareRecords.userId, users.id))
      .where(eq(shareRecords.id, recordId))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      );
    }

    // 格式化时间字段
    const formattedRecord = {
      ...record,
      submittedAt: record.submittedAt?.toISOString(),
      verifiedAt: record.verifiedAt?.toISOString(),
      scheduledVerifyAt: record.scheduledVerifyAt?.toISOString(),
      createdAt: record.createdAt?.toISOString(),
      updatedAt: record.updatedAt?.toISOString(),
    };

    return NextResponse.json({ record: formattedRecord });

  } catch (error) {
    console.error('获取转发记录详情失败:', error);
    return NextResponse.json(
      { error: '获取转发记录详情失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新单个转发记录状态（管理员）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const recordId = id;
    const body = await request.json();
    const { action, reason } = body;

    if (!action) {
      return NextResponse.json(
        { error: '缺少操作类型' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'approve':
        // 通过验证
        result = await verifyShareRecord(recordId);
        break;

      case 'reject':
        // 拒绝验证
        const [rejectedRecord] = await db
          .update(shareRecords)
          .set({
            status: 'rejected',
            verifiedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(shareRecords.id, recordId))
          .returning();

        if (!rejectedRecord) {
          return NextResponse.json(
            { error: '记录不存在' },
            { status: 404 }
          );
        }

        result = rejectedRecord;
        break;

      case 'reset':
        // 重置为待验证状态
        const [resetRecord] = await db
          .update(shareRecords)
          .set({
            status: 'pending',
            verifiedAt: null,
            scheduledVerifyAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时后
            updatedAt: new Date()
          })
          .where(eq(shareRecords.id, recordId))
          .returning();

        if (!resetRecord) {
          return NextResponse.json(
            { error: '记录不存在' },
            { status: 404 }
          );
        }

        result = resetRecord;
        break;

      default:
        return NextResponse.json(
          { error: '不支持的操作' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      record: {
        ...result,
        submittedAt: result.submittedAt?.toISOString(),
        verifiedAt: result.verifiedAt?.toISOString(),
        scheduledVerifyAt: result.scheduledVerifyAt?.toISOString(),
        createdAt: result.createdAt?.toISOString(),
        updatedAt: result.updatedAt?.toISOString(),
      },
      message: `记录已${action === 'approve' ? '通过' : action === 'reject' ? '拒绝' : '重置'}`
    });

  } catch (error) {
    console.error('更新转发记录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新转发记录失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除单个转发记录（管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const recordId = id;

    // 1. 先获取记录信息（包含图片路径）
    const [record] = await db
      .select()
      .from(shareRecords)
      .where(eq(shareRecords.id, recordId))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      );
    }

    // 2. 删除数据库记录
    await db.delete(shareRecords).where(eq(shareRecords.id, recordId));

    // 3. 删除对应的图片文件
    if (record.imageUrl) {
      try {
        const filePath = join(process.cwd(), 'public', record.imageUrl);
        await unlink(filePath);
        console.log(`✅ 已删除图片文件: ${record.imageUrl}`);
      } catch (fileError) {
        console.warn(`⚠️ 删除图片文件失败: ${record.imageUrl}`, fileError);
        // 不抛出错误，因为数据库记录已删除
      }
    }

    return NextResponse.json({
      success: true,
      message: '记录已删除'
    });

  } catch (error) {
    console.error('删除转发记录失败:', error);
    return NextResponse.json(
      { error: '删除转发记录失败' },
      { status: 500 }
    );
  }
}
