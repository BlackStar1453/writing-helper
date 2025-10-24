import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.AUTH_SECRET || 'default_secret_change_this';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password }: LoginRequest = await req.json();

    // 输入验证
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: '邮箱和密码不能为空'
      }, { status: 400 });
    }

    if (!email.includes('@')) {
      return NextResponse.json({
        success: false,
        error: '请输入有效的邮箱地址'
      }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        error: '密码长度至少8位'
      }, { status: 400 });
    }

    console.log('[Tauri Login API] 尝试登录:', email);

    // 使用 Supabase Auth 进行登录验证
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.log('[Tauri Login API] 认证失败:', authError?.message);
      return NextResponse.json({
        success: false,
        error: '邮箱或密码不正确'
      }, { status: 401 });
    }

    console.log('[Tauri Login API] Supabase 认证成功:', authData.user.id);

    // 从数据库获取用户的额外信息
    const userWithExtras = await db
      .select()
      .from(users)
      .where(eq(users.id, authData.user.id))
      .limit(1);

    if (userWithExtras.length === 0) {
      console.log('[Tauri Login API] 用户信息不存在于数据库');
      return NextResponse.json({
        success: false,
        error: '用户信息不存在'
      }, { status: 404 });
    }

    const user = userWithExtras[0];
    console.log('[Tauri Login API] 获取用户信息成功:', {
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

    // 生成JWT令牌
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 30); // 30天有效期

    const token = sign(
      { 
        userId: user.id,
        email: user.email,
        exp: Math.floor(expiresDate.getTime() / 1000)
      },
      JWT_SECRET
    );

    console.log('[Tauri Login API] JWT令牌生成成功');

    // 组装用户数据（服务端非空化，避免客户端解析 null）
    const userData = {
      id: user.id,
      email: user.email,
      plan: user.planName || 'free',
      subscription_status: user.subscriptionStatus || 'inactive',
      subscription_interval: user.subscriptionInterval || null,
      subscription_expires_at: processedExpiresAt,
      premium_type: user.premiumType || null,
    };

    console.log('[Tauri Login API] 登录成功，返回用户数据');
    console.log('[Tauri Login API] 响应预览:', {
      success: true,
      user_data: userData,
      token_prefix: typeof token === 'string' ? token.substring(0, 12) : null
    });

    return NextResponse.json({
      success: true,
      user_data: userData,
      token: token
    });

  } catch (error) {
    console.error('[Tauri Login API] 错误:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}
