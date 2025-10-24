import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.AUTH_SECRET || 'default_secret_change_this';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '令牌不能为空'
      }, { status: 400 });
    }

    console.log('[Tauri Verify Token API] 验证令牌...');

    // 验证JWT令牌
    let decoded;
    try {
      decoded = verify(token, JWT_SECRET) as { userId: string; email: string; exp: number };
      console.log('[Tauri Verify Token API] 令牌解析成功:', decoded.userId);
    } catch (error) {
      console.log('[Tauri Verify Token API] 令牌验证失败:', error);
      return NextResponse.json({
        success: false,
        error: '令牌无效或已过期'
      }, { status: 401 });
    }

    // 检查用户是否存在
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (userRecord.length === 0) {
      console.log('[Tauri Verify Token API] 用户不存在:', decoded.userId);
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    const user = userRecord[0];
    console.log('[Tauri Verify Token API] 用户验证成功:', {
      id: user.id,
      email: user.email,
      plan: user.planName
    });

    // 处理订阅过期时间
    let processedExpiresAt = null;
    if (user.subscriptionExpiresAt) {
      processedExpiresAt = user.subscriptionExpiresAt instanceof Date 
        ? user.subscriptionExpiresAt.toISOString()
        : user.subscriptionExpiresAt;
    }

    // 返回用户数据（服务端非空化，避免客户端解析 null）
    const userData = {
      id: user.id,
      email: user.email,
      plan: user.planName || 'free',
      subscription_status: user.subscriptionStatus || 'inactive',
      subscription_interval: user.subscriptionInterval || null,
      subscription_expires_at: processedExpiresAt,
      premium_type: user.premiumType || null,
    };

    console.log('[Tauri Verify Token API] 令牌验证成功，返回用户数据');
    console.log('[Tauri Verify Token API] 响应预览:', {
      success: true,
      user_data: userData
    });

    return NextResponse.json({
      success: true,
      user_data: userData,
      valid: true
    });

  } catch (error) {
    console.error('[Tauri Verify Token API] 错误:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}
