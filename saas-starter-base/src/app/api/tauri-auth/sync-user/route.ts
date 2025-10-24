// API：用于手动触发用户状态同步到客户端
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { generateUserSyncDeepLink } from '@/lib/user-sync-notification';

// 用于手动触发用户数据同步
export async function POST(req: NextRequest) {
  try {
    // 检查用户是否已登录
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: '用户未登录' }, { status: 401 });
    }

    // 生成同步深度链接
    const syncUrl = await generateUserSyncDeepLink(user.id);

    if (!syncUrl) {
      return NextResponse.json({
        success: false,
        error: '生成同步链接失败'
      }, { status: 500 });
    }


    return NextResponse.json({
      success: true,
      syncUrl,
      userData: {
        planName: user.planName,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionInterval: user.subscriptionInterval,
        subscriptionExpiresAt: user.subscriptionExpiresAt
      }
    });
  } catch (error) {
    console.error('[Tauri-Sync] 同步API错误:', error);
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}
