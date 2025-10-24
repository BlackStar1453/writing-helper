import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db/drizzle';
import { users, NewUser } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCachedRegistrationConfig } from '@/lib/config/registration';
import { checkSignupRateLimit } from '@/lib/security/rate-limiter';

interface RegisterRequest {
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password }: RegisterRequest = await req.json();

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

    console.log('[Tauri Register API] 尝试注册:', email);

    // 严格按 IP 限流（优先 Redis，回退内存）：5分钟1次，24小时最多3次
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const realIp = req.headers.get('x-real-ip') || '';
    const clientIp = (forwardedFor.split(',')[0] || realIp || '127.0.0.1').trim();

    const rate = await checkSignupRateLimit(clientIp);
    if (!rate.allowed) {
      console.log('[Tauri Register API] 触发限流:', { clientIp, rate });
      return NextResponse.json({
        success: false,
        error: rate.reason || '注册请求过于频繁，请稍后再试',
      }, { status: 429 });
    }

    // 统一使用 Supabase signUp；是否需要邮箱验证由 Supabase 项目设置控制
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: { name: null },
      },
    });

    if (authError) {
      console.log('[Tauri Register API] Supabase 注册失败:', authError.message);
      let errorMessage = '注册失败';
      if (authError.message.includes('already registered')) errorMessage = '该邮箱已被注册';
      else if (authError.message.includes('password')) errorMessage = '密码格式不正确';
      else if (authError.message.includes('email')) errorMessage = '邮箱格式不正确';
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }

    if (!authData.user) {
      console.log('[Tauri Register API] 注册返回空用户');
      return NextResponse.json({ success: false, error: '注册失败，请重试' }, { status: 400 });
    }

    let userId: string = authData.user.id;
    let userMetaName: string | null = authData.user.user_metadata?.name || null;
    console.log('[Tauri Register API] Supabase 注册成功:', userId);

    // 检查用户是否已存在于数据库
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      console.log('[Tauri Register API] 创建新用户记录...');
      const registrationConfig = getCachedRegistrationConfig();

      const newUser: NewUser = {
        id: userId!,
        email,
        name: userMetaName,
        role: 'owner',
        premiumRequestsLimit: registrationConfig.userLimits.premiumRequestsLimit,
        fastRequestsUsed: 0,
        fastRequestsLimit: registrationConfig.userLimits.fastRequestsLimit,
      };

      try {
        await db.insert(users).values(newUser);
        console.log('[Tauri Register API] 用户记录创建成功');
      } catch (dbError) {
        console.error('[Tauri Register API] 创建用户记录失败:', dbError);
        return NextResponse.json({ success: false, error: '创建用户记录失败' }, { status: 500 });
      }
    } else {
      console.log('[Tauri Register API] 用户记录已存在');
    }

    const requiresVerification = !authData.user.email_confirmed_at;
    console.log('[Tauri Register API] 注册完成，requires_verification =', requiresVerification);
    return NextResponse.json({
      success: true,
      message: requiresVerification ? '注册成功，请检查邮箱并点击验证链接完成注册' : '注册成功，请登录',
      requires_verification: requiresVerification,
    });
  } catch (error) {
    console.error('[Tauri Register API] 错误:', error);
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}
