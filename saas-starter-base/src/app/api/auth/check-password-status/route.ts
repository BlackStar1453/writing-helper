import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // 验证 token 并获取用户信息
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 检查用户的认证提供商
    const identities = user.identities || [];
    const hasOAuthProvider = identities.some(identity => 
      identity.provider === 'google' || identity.provider === 'github'
    );
    
    // 检查用户是否有密码（通过尝试获取用户的加密密码信息）
    // 如果用户只有OAuth身份且没有email/password身份，说明没有设置密码
    const hasEmailPasswordIdentity = identities.some(identity => 
      identity.provider === 'email'
    );

    const needsPasswordSetup = hasOAuthProvider && !hasEmailPasswordIdentity;

    return NextResponse.json({
      success: true,
      needsPasswordSetup,
      hasOAuthProvider,
      hasEmailPasswordIdentity,
      providers: identities.map(i => i.provider)
    });
  } catch (error) {
    console.error('[Check Password Status] 检查密码状态失败:', error);
    return NextResponse.json(
      { error: 'Failed to check password status' },
      { status: 500 }
    );
  }
}
