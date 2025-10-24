import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const setPasswordSchema = z.object({
  password: z.string().min(8, '密码至少需要8个字符').max(100, '密码不能超过100个字符'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "密码确认不匹配",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
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

    const requestBody = await request.json();
    
    // 验证请求数据
    const validationResult = setPasswordSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const { password } = validationResult.data;

    // 所有到达这个API的用户都是第三方登录用户，需要设置密码
    console.log('[Set Initial Password] 为第三方登录用户设置密码:', user.id);

    // 为用户设置密码
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password,
      email_confirm: true // 确保邮箱已确认
    });

    if (updateError) {
      console.error('[Set Initial Password] 设置密码失败:', updateError);
      return NextResponse.json({ 
        error: 'Failed to set password',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '密码设置成功'
    });
  } catch (error) {
    console.error('[Set Initial Password] 设置初始密码失败:', error);
    return NextResponse.json(
      { error: 'Failed to set initial password' },
      { status: 500 }
    );
  }
}
