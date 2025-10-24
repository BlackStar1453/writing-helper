import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAPI } from '@/lib/auth/admin-middleware';
import { db } from '@/lib/db/drizzle';
import { shareRecords, users } from '@/lib/db/schema';
import { eq, desc, and, or, like, sql } from 'drizzle-orm';
import { verifyShareRecord } from '@/lib/db/queries';
import { checkAdminRateLimit } from '@/lib/security/rate-limiter';
import { unlink } from 'fs/promises';
import { join } from 'path';

// GET - 获取所有转发记录（管理员）
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];
    
    if (status) {
      conditions.push(eq(shareRecords.status, status));
    }
    
    if (platform) {
      conditions.push(eq(shareRecords.platform, platform));
    }
    
    if (search) {
      conditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.name, `%${search}%`),
          like(shareRecords.id, `%${search}%`)
        )
      );
    }

    // 查询记录
    const records = await db
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
      })
      .from(shareRecords)
      .leftJoin(users, eq(shareRecords.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(shareRecords.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(shareRecords)
      .leftJoin(users, eq(shareRecords.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 格式化时间字段
    const formattedRecords = records.map(record => ({
      ...record,
      submittedAt: record.submittedAt?.toISOString(),
      verifiedAt: record.verifiedAt?.toISOString(),
      scheduledVerifyAt: record.scheduledVerifyAt?.toISOString(),
      createdAt: record.createdAt?.toISOString(),
      updatedAt: record.updatedAt?.toISOString(),
    }));

    return NextResponse.json({
      records: formattedRecords,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('获取转发记录失败:', error);
    return NextResponse.json(
      { error: '获取转发记录失败' },
      { status: 500 }
    );
  }
}

// POST - 批量操作转发记录（管理员）
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { action, recordIds, confirmDelete } = body;

    if (!action || !recordIds || !Array.isArray(recordIds)) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 检查速率限制
    if (!authResult.user?.id) {
      return NextResponse.json(
        { error: 'Admin user ID not found' },
        { status: 400 }
      );
    }

    const rateLimitResult = await checkAdminRateLimit(authResult.user.id, 'batch');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: '操作频率过高',
          message: rateLimitResult.message,
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // 验证记录ID的有效性
    if (recordIds.length === 0) {
      return NextResponse.json(
        { error: '至少需要选择一条记录' },
        { status: 400 }
      );
    }

    if (recordIds.length > 100) {
      return NextResponse.json(
        { error: '单次操作不能超过100条记录' },
        { status: 400 }
      );
    }

    // 验证所有记录ID是否存在
    const validRecords = await db
      .select({ id: shareRecords.id })
      .from(shareRecords)
      .where(sql`${shareRecords.id} = ANY(${recordIds})`);

    if (validRecords.length !== recordIds.length) {
      return NextResponse.json(
        { error: '包含无效的记录ID' },
        { status: 400 }
      );
    }

    // 删除操作需要额外确认
    if (action === 'delete' && !confirmDelete) {
      return NextResponse.json(
        { error: '删除操作需要确认参数 confirmDelete: true' },
        { status: 400 }
      );
    }

    const results = [];
    const adminUserId = authResult.user.id;

    switch (action) {
      case 'approve':
        // 批量通过验证
        for (const recordId of recordIds) {
          try {
            const record = await verifyShareRecord(recordId);
            results.push({
              id: recordId,
              status: 'success',
              message: '验证通过'
            });
          } catch (error) {
            results.push({
              id: recordId,
              status: 'error',
              message: error instanceof Error ? error.message : '验证失败'
            });
          }
        }
        break;

      case 'reject':
        // 批量拒绝
        await db
          .update(shareRecords)
          .set({
            status: 'rejected',
            verifiedAt: new Date(),
            updatedAt: new Date()
          })
          .where(sql`${shareRecords.id} = ANY(${recordIds})`);

        recordIds.forEach(id => {
          results.push({
            id,
            status: 'success',
            message: '已拒绝'
          });
        });
        break;

      case 'delete':
        // 批量删除
        // 1. 先获取所有记录的图片路径
        const recordsToDelete = await db
          .select({ id: shareRecords.id, imageUrl: shareRecords.imageUrl })
          .from(shareRecords)
          .where(sql`${shareRecords.id} = ANY(${recordIds})`);

        // 2. 删除数据库记录
        await db
          .delete(shareRecords)
          .where(sql`${shareRecords.id} = ANY(${recordIds})`);

        // 3. 删除对应的图片文件
        for (const record of recordsToDelete) {
          if (record.imageUrl) {
            try {
              const filePath = join(process.cwd(), 'public', record.imageUrl);
              await unlink(filePath);
              console.log(`✅ 已删除图片文件: ${record.imageUrl}`);
            } catch (fileError) {
              console.warn(`⚠️ 删除图片文件失败: ${record.imageUrl}`, fileError);
            }
          }
        }

        recordIds.forEach(id => {
          results.push({
            id,
            status: 'success',
            message: '已删除'
          });
        });
        break;

      default:
        return NextResponse.json(
          { error: '不支持的操作' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      results,
      message: `批量${action}操作完成`
    });

  } catch (error) {
    console.error('批量操作失败:', error);
    return NextResponse.json(
      { error: '批量操作失败' },
      { status: 500 }
    );
  }
}
