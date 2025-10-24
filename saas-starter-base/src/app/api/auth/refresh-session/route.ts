import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // 获取当前用户session
    const currentUser = await getSession();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }

    console.log('刷新用户session:', currentUser.user.id);

    // 从数据库重新获取最新的用户数据
    const result = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, currentUser.user.id),
        isNull(users.deletedAt)
      ))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const updatedUser = result[0];
    
    // 重新设置session，使用最新的用户数据
    await setSession(updatedUser);
    
    console.log('用户session已刷新:', {
      userId: updatedUser.id,
      email: updatedUser.email,
      planName: updatedUser.planName,
      subscriptionStatus: updatedUser.subscriptionStatus
    });

    return NextResponse.json({ 
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        planName: updatedUser.planName,
        subscriptionStatus: updatedUser.subscriptionStatus
      }
    });

  } catch (error) {
    console.error('刷新用户session失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
} 