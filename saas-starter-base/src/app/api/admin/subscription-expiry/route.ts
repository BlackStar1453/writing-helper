import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import { 
  getUsersNearingExpiry, 
  getExpiredUsers, 
  checkUserSubscriptionExpiry,
  syncStripeSubscriptionStatuses,
  batchHandleExpiredUsers
} from '@/lib/subscription-expiry';

// 获取订阅到期状态
export async function GET(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();
    
    if (userOrError instanceof Response) {
      return userOrError;
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    switch (action) {
      case 'check_user':
        if (!userId) {
          return NextResponse.json({
            success: false,
            error: '缺少用户ID'
          }, { status: 400 });
        }

        const userExpiry = await checkUserSubscriptionExpiry(userId);
        return NextResponse.json({
          success: true,
          data: userExpiry
        });

      case 'nearing_expiry':
        const daysAhead = parseInt(searchParams.get('days') || '7');
        const nearingUsers = await getUsersNearingExpiry(daysAhead);
        return NextResponse.json({
          success: true,
          data: {
            count: nearingUsers.length,
            users: nearingUsers
          }
        });

      case 'expired':
        const expiredUsers = await getExpiredUsers();
        return NextResponse.json({
          success: true,
          data: {
            count: expiredUsers.length,
            users: expiredUsers
          }
        });

      default:
        // 默认返回概览信息
        const [nearing, expired] = await Promise.all([
          getUsersNearingExpiry(7),
          getExpiredUsers()
        ]);

        return NextResponse.json({
          success: true,
          data: {
            nearingExpiry: {
              count: nearing.length,
              users: nearing.slice(0, 10) // 只返回前10个
            },
            expired: {
              count: expired.length,
              users: expired.slice(0, 10) // 只返回前10个
            },
            summary: {
              totalNearingExpiry: nearing.length,
              totalExpired: expired.length,
              lastChecked: new Date().toISOString()
            }
          }
        });
    }

  } catch (error) {
    console.error('获取订阅到期状态失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '内部服务器错误'
    }, { status: 500 });
  }
}

// 执行订阅到期相关操作
export async function POST(request: NextRequest) {
  try {
    const userOrError = await adminMiddleware();
    
    if (userOrError instanceof Response) {
      return userOrError;
    }

    const body = await request.json();
    const { action, userId } = body;

    switch (action) {
      case 'sync_stripe':
        // 同步Stripe订阅状态
        const syncResult = await syncStripeSubscriptionStatuses();
        return NextResponse.json({
          success: true,
          message: `Stripe状态同步完成，同步了 ${syncResult.totalSynced} 个用户`,
          data: syncResult
        });

      case 'handle_expired':
        // 批量处理过期用户
        const handleResult = await batchHandleExpiredUsers();
        return NextResponse.json({
          success: true,
          message: `过期用户处理完成，处理了 ${handleResult.totalProcessed} 个用户`,
          data: handleResult
        });

      case 'check_user_expiry':
        // 检查特定用户的到期状态
        if (!userId) {
          return NextResponse.json({
            success: false,
            error: '缺少用户ID'
          }, { status: 400 });
        }

        const userExpiryInfo = await checkUserSubscriptionExpiry(userId);
        return NextResponse.json({
          success: true,
          data: userExpiryInfo
        });

      default:
        return NextResponse.json({
          success: false,
          error: '未知操作'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('执行订阅到期操作失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '内部服务器错误'
    }, { status: 500 });
  }
}
