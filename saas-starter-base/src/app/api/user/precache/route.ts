import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { 
  generateUserPrecacheData, 
  createSessionTokenWithPrecache,
  getUserPrecacheData 
} from '@/lib/client-precache';
import { UserSessionWarmup } from '@/lib/warmup';

/**
 * 获取用户预缓存数据
 * 在用户登录后调用，预加载关键信息到客户端
 */
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;

    // 并行执行预缓存生成和会话预热
    const [precacheData] = await Promise.all([
      generateUserPrecacheData(userId),
      UserSessionWarmup.warmupUserSession(userId).catch(error => {
        console.warn('用户会话预热失败:', error);
      })
    ]);

    if (!precacheData) {
      return NextResponse.json(
        { error: 'Failed to generate precache data' },
        { status: 500 }
      );
    }

    // 创建包含预缓存数据的会话 token
    const sessionToken = createSessionTokenWithPrecache(userId, precacheData);

    return NextResponse.json({
      success: true,
      data: {
        // 客户端可以安全使用的数据
        userId: precacheData.userId,
        subscriptionStatus: precacheData.subscriptionStatus,
        planName: precacheData.planName,
        
        usage: {
          premium: {
            used: precacheData.premiumRequestsUsed,
            limit: precacheData.premiumRequestsLimit,
            remaining: precacheData.premiumRequestsLimit - precacheData.premiumRequestsUsed
          },
          fast: {
            used: precacheData.fastRequestsUsed,
            limit: precacheData.fastRequestsLimit,
            remaining: precacheData.fastRequestsLimit - precacheData.fastRequestsUsed
          }
        },
        
        models: {
          available: precacheData.availableModels,
          default: precacheData.defaultModel
        },
        
        cache: {
          cacheTime: precacheData.cacheTime,
          expiresAt: precacheData.expiresAt
        },
        
        // 会话 token（可选，用于离线缓存）
        sessionToken: sessionToken
      }
    });

  } catch (error) {
    console.error('获取用户预缓存数据失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 更新用户预缓存数据
 */
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'refresh':
        // 刷新预缓存数据
        const newPrecacheData = await generateUserPrecacheData(userId);
        if (!newPrecacheData) {
          return NextResponse.json(
            { error: 'Failed to refresh precache data' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            userId: newPrecacheData.userId,
            subscriptionStatus: newPrecacheData.subscriptionStatus,
            planName: newPrecacheData.planName,
            usage: {
              premium: {
                used: newPrecacheData.premiumRequestsUsed,
                limit: newPrecacheData.premiumRequestsLimit,
                remaining: newPrecacheData.premiumRequestsLimit - newPrecacheData.premiumRequestsUsed
              },
              fast: {
                used: newPrecacheData.fastRequestsUsed,
                limit: newPrecacheData.fastRequestsLimit,
                remaining: newPrecacheData.fastRequestsLimit - newPrecacheData.fastRequestsUsed
              }
            },
            models: {
              available: newPrecacheData.availableModels,
              default: newPrecacheData.defaultModel
            },
            cache: {
              cacheTime: newPrecacheData.cacheTime,
              expiresAt: newPrecacheData.expiresAt
            }
          }
        });

      case 'warmup':
        // 预热用户会话
        await UserSessionWarmup.warmupUserSession(userId);
        return NextResponse.json({
          success: true,
          message: 'User session warmed up'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('更新用户预缓存数据失败:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
