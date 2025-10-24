import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import { runQuotaResetJob, getUsersNeedingQuotaReset, handleAnnualSubscriptionRenewal } from '@/lib/subscription-renewal';

// 手动触发额度重置任务
export async function POST(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();
    
    if (userOrError instanceof Response) {
      return userOrError;
    }

    const body = await request.json();
    const { action, userId } = body;

    switch (action) {
      case 'run_job':
        // 运行完整的额度重置任务
        const jobResult = await runQuotaResetJob();
        return NextResponse.json({
          success: true,
          message: '额度重置任务执行完成',
          data: jobResult
        });

      case 'check_users':
        // 检查需要重置额度的用户
        const usersNeedingReset = await getUsersNeedingQuotaReset();
        return NextResponse.json({
          success: true,
          message: `发现 ${usersNeedingReset.length} 个用户需要重置额度`,
          data: {
            count: usersNeedingReset.length,
            users: usersNeedingReset
          }
        });

      case 'handle_annual':
        // 处理特定年付用户
        if (!userId) {
          return NextResponse.json({
            success: false,
            error: '缺少用户ID'
          }, { status: 400 });
        }

        const annualResult = await handleAnnualSubscriptionRenewal(userId);
        return NextResponse.json({
          success: annualResult.success,
          message: annualResult.message
        });

      default:
        return NextResponse.json({
          success: false,
          error: '未知操作'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('额度重置API错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '内部服务器错误'
    }, { status: 500 });
  }
}

// 获取额度重置状态
export async function GET(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();
    
    if (userOrError instanceof Response) {
      return userOrError;
    }

    const usersNeedingReset = await getUsersNeedingQuotaReset();
    
    return NextResponse.json({
      success: true,
      data: {
        needsResetCount: usersNeedingReset.length,
        users: usersNeedingReset.map(user => ({
          userId: user.userId,
          planName: user.planName,
          subscriptionInterval: user.subscriptionInterval,
          lastResetAt: user.lastResetAt,
          daysSinceReset: Math.floor(
            (new Date().getTime() - user.lastResetAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        }))
      }
    });

  } catch (error) {
    console.error('获取额度重置状态失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '内部服务器错误'
    }, { status: 500 });
  }
}
