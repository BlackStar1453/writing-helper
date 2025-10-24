import { NextRequest, NextResponse } from 'next/server';
import { fastVerifyAuth } from '@/lib/auth';
import { getClientFriendlyCorsHeaders, handleCorsOptions } from '@/lib/config/cors';
import { createErrorResponse, createSuccessResponse } from '@/lib/request-utils';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 处理 OPTIONS 请求（预检请求）
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

/**
 * 订阅验证端点
 * POST /api/subscription/verify
 * 验证用户订阅状态和到期时间
 */
export async function POST(req: NextRequest) {
  try {
    // 获取客户端友好的CORS头
    const corsHeaders = {
      ...getClientFriendlyCorsHeaders(),
      'Content-Type': 'application/json',
    };

    // 1. 快速认证
    const authResult = await fastVerifyAuth(req);
    if (!authResult.success) {
      const errorResponse = createErrorResponse(
        'UNAUTHORIZED', 
        'Authentication failed', 
        401
      );
      return NextResponse.json(errorResponse, { 
        status: errorResponse.status, 
        headers: corsHeaders 
      });
    }

    // 2. 解析请求体
    const body = await req.json();
    const { userId, email, plan } = body;

    // 3. 验证请求参数
    if (!userId || !email) {
      const errorResponse = createErrorResponse(
        'BAD_REQUEST',
        'Missing required parameters: userId, email'
      );
      return NextResponse.json(errorResponse, {
        status: errorResponse.status,
        headers: corsHeaders
      });
    }

    // 4. 验证用户ID匹配
    if (authResult.userId !== userId) {
      const errorResponse = createErrorResponse(
        'FORBIDDEN',
        'User ID mismatch'
      );
      return NextResponse.json(errorResponse, {
        status: errorResponse.status,
        headers: corsHeaders
      });
    }

    // 5. 从数据库获取用户完整订阅信息
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        planName: users.planName,
        premiumType: users.premiumType,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        subscriptionInterval: users.subscriptionInterval,
        stripeSubscriptionId: users.stripeSubscriptionId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      const errorResponse = createErrorResponse(
        'USER_NOT_FOUND',
        'User not found',
        404
      );
      return NextResponse.json(errorResponse, { 
        status: errorResponse.status, 
        headers: corsHeaders 
      });
    }

    // 6. 验证邮箱匹配
    if (user.email !== email) {
      const errorResponse = createErrorResponse(
        'FORBIDDEN',
        'Email mismatch'
      );
      return NextResponse.json(errorResponse, {
        status: errorResponse.status,
        headers: corsHeaders
      });
    }

    // 7. 检查订阅状态
    const now = new Date();
    let isActive = false;
    let expiresAt: number | null = null;

    // 检查是否为 Premium 用户
    const isPremiumUser = user.planName && ['Premium', 'Lifetime'].includes(user.planName);

    if (isPremiumUser) {
      // Lifetime 用户永不过期
      if (user.planName === 'Lifetime') {
        isActive = true;
        expiresAt = null; // Lifetime 没有到期时间
      } else {
        // Premium 用户检查订阅状态和到期时间
        const hasValidStatus = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
        const hasValidExpiry = !user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > now;
        
        isActive = hasValidStatus && hasValidExpiry;
        expiresAt = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).getTime() : null;
      }
    } else {
      // 非 Premium 用户
      isActive = false;
      expiresAt = null;
    }

    // 8. 构建响应数据
    const subscriptionData = {
      isActive,
      expiresAt,
      planName: user.planName,
      premiumType: user.premiumType,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionInterval: user.subscriptionInterval,
      // 额外的调试信息（可选）
      debug: {
        userId: user.id,
        email: user.email,
        currentTime: now.getTime(),
        subscriptionExpiresAt: user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).getTime() : null,
      }
    };

    // 9. 返回成功响应
    const successResponse = createSuccessResponse({
      subscription: subscriptionData
    });

    return NextResponse.json(successResponse, { headers: corsHeaders });

  } catch (error: any) {
    // 获取客户端友好的CORS头
    const corsHeaders = {
      ...getClientFriendlyCorsHeaders(),
      'Content-Type': 'application/json',
    };

    console.error('订阅验证失败:', error);
    const errorResponse = createErrorResponse(
      'INTERNAL_ERROR',
      'Internal server error',
      500
    );
    return NextResponse.json(errorResponse, { 
      status: errorResponse.status, 
      headers: corsHeaders 
    });
  }
}
