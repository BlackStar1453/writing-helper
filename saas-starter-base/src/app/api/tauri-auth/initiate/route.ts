// /app/api/tauri-auth/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getUser, getUserById } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { users, NewUser } from '@/lib/db/schema';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedRegistrationConfig } from '@/lib/config/registration';
import { sign } from 'jsonwebtoken';
import { validateDevice, extractDeviceInfo } from '@/lib/device-management';

const JWT_SECRET = process.env.AUTH_SECRET || 'default_secret_change_this';

// Tauri桌面端认证API
export async function POST(req: NextRequest) {
  try {
    // 优先使用 Authorization Bearer Token 验证（来自 OAuth 回调），否则回退到应用 session cookie
    let appUser: any = null;

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      try {
        const { data: { user: supaUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
        if (authError) {
          console.warn('[Tauri-Auth] Bearer token 验证失败，回退到 cookie 会话:', authError.message);
        } else if (supaUser) {
          // 确保应用数据库中存在该用户；不存在则自动注册
          const existing = await getUserById(supaUser.id);
          if (!existing) {
            const reg = getCachedRegistrationConfig();
            const newUser: NewUser = {
              id: supaUser.id,
              email: supaUser.email || '',
              name: (supaUser.user_metadata as any)?.name || null,
              role: 'owner',
              premiumRequestsLimit: reg.userLimits.premiumRequestsLimit,
              fastRequestsUsed: 0,
              fastRequestsLimit: reg.userLimits.fastRequestsLimit,
            };
            await db.insert(users).values(newUser);
            appUser = await getUserById(supaUser.id);
          } else {
            appUser = existing;
          }
        }
      } catch (e) {
        console.warn('[Tauri-Auth] 验证 Bearer token 异常，回退到 cookie 会话:', e);
      }
    }

    if (!appUser) {
      appUser = await getUser();
    }

    if (!appUser) {
      // 完全移除“必须先登录网页”的限制：此处仅在既无 Bearer 又无 cookie 时返回 401
      return NextResponse.json({ success: false, error: '未提供有效的认证信息' }, { status: 401 });
    }

    // 仅对 Lifetime 用户做设备校验；普通用户直接通过
    const isLifetimeUser = appUser.planName === 'Lifetime';
    if (isLifetimeUser) {
      console.log('[Tauri-Auth] 为 Lifetime 用户进行设备验证...');
      const deviceInfo = extractDeviceInfo(req);
      const deviceValidation = await validateDevice(appUser.id, deviceInfo);
      if (!deviceValidation.isValid) {
        console.error('[Tauri-Auth] 设备验证失败:', deviceValidation.error);
        return NextResponse.json({
          success: false,
          error: 'device_limit_exceeded',
          message: deviceValidation.error,
          deviceCount: deviceValidation.deviceCount,
          maxDevices: deviceValidation.maxDevices,
        }, { status: 429 });
      }
      console.log(deviceValidation.isNewDevice ? '[Tauri-Auth] 新设备注册成功' : '[Tauri-Auth] 设备验证通过');
    }

    // 生成唯一 state
    const state = nanoid();

    // 生成 JWT token（供桌面端使用）
    const token = sign(
      {
        userId: appUser.id,
        email: appUser.email,
        name: appUser.name || '',
        role: appUser.role,
      },
      JWT_SECRET,
      { expiresIn: '720h' }
    );

    const date = new Date();
    const expiresDate = date.setHours(date.getHours() + 720);

    // 处理 subscriptionExpiresAt 字段（Date -> 时间戳字符串）
    let processedExpiresAt: string | null = null;
    if (appUser.subscriptionExpiresAt) {
      if (appUser.subscriptionExpiresAt instanceof Date) {
        processedExpiresAt = appUser.subscriptionExpiresAt.getTime().toString();
      } else {
        const dateObj = new Date(appUser.subscriptionExpiresAt);
        processedExpiresAt = isNaN(dateObj.getTime()) ? null : dateObj.getTime().toString();
      }
    }

    // 组装用户信息
    const userData = {
      id: appUser.id,
      email: appUser.email,
      plan: appUser.planName,
      subscriptionStatus: appUser.subscriptionStatus,
      subscriptionInterval: appUser.subscriptionInterval,
      subscriptionExpiresAt: processedExpiresAt,
      token: token,
      expiresDate: expiresDate,
      syncType: 'login',
      premiumType: appUser.premiumType || null,
    };

    // 生成 deep link
    const authUrl = `elick://auth?user_data=${encodeURIComponent(JSON.stringify(userData))}&state=${state}`;

    return NextResponse.json({ success: true, authUrl, state });
  } catch (error) {
    console.error('[Tauri-Auth] 认证API错误:', error);
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}