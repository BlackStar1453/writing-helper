import { NextRequest, NextResponse } from 'next/server';
import { processShareVerifications } from '@/lib/cron/share-verification';
import { verifyAdminAPI } from '@/lib/auth/admin-middleware';

// POST - 手动触发转发验证任务（仅限管理员）
export async function POST(request: NextRequest) {
  try {
    // 添加管理员权限验证
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const result = await processShareVerifications();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500
    });
  } catch (error) {
    console.error('执行转发验证任务失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '执行转发验证任务失败',
        processed: 0
      },
      { status: 500 }
    );
  }
}

// GET - 获取任务状态信息
export async function GET() {
  try {
    // 这里可以返回任务的状态信息，比如上次执行时间、待处理数量等
    return NextResponse.json({
      message: '转发验证定时任务端点',
      endpoint: '/api/cron/share-verification',
      methods: ['GET', 'POST'],
      description: {
        GET: '获取任务状态信息',
        POST: '手动触发验证任务'
      }
    });
  } catch (error) {
    console.error('获取任务状态失败:', error);
    return NextResponse.json(
      { error: '获取任务状态失败' },
      { status: 500 }
    );
  }
}
