import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 重新发送验证邮件
    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      console.error('重发验证邮件失败:', error);
      return NextResponse.json(
        { error: 'Failed to resend verification email: ' + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    console.error('重发验证邮件时发生错误:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 