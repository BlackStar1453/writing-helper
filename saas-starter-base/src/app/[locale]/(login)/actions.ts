'use server';

import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  NewUser,
  users,
} from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import { getBaseUrl } from '@/lib/utils';
import { supabaseAdmin } from '@/lib/supabase';
import { getCachedRegistrationConfig } from '@/lib/config/registration';



// 获取扩展认证信息 - 暂时注释掉
// async function getExtensionAuthInfo(state: string) {
//   try {
//     console.log(`[扩展认证] 尝试获取认证信息，state: ${state}`);

//     // 使用辅助函数获取基础URL
//     const baseUrl = getBaseUrl();

//     // 使用完整URL，确保在服务器端可以正常工作
//     const apiUrl = `${baseUrl}/api/extension-auth/init?state=${state}`;
//     console.log(`[扩展认证] 请求API: ${apiUrl}`);

//     const response = await fetch(apiUrl, {
//       method: 'GET',
//       // 确保不缓存结果
//       cache: 'no-store',
//       headers: {
//         'Accept': 'application/json',
//       },
//       next: { revalidate: 0 }
//     });

//     console.log(`[扩展认证] API响应状态: ${response.status}`);

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error(`[扩展认证] API响应错误: ${errorText}`);
//       throw new Error(`API响应错误(${response.status}): ${errorText}`);
//     }

//     const data = await response.json();
//     console.log(`[扩展认证] API响应数据:`, data);

//     if (!data.valid) {
//       console.error(`[扩展认证] 无效的认证数据:`, data);
//       throw new Error(`无效的认证数据: ${JSON.stringify(data)}`);
//     }

//     return data;
//   } catch (error) {
//     console.error('[扩展认证] 获取扩展认证信息失败:', error);
//     // 记录详细的错误堆栈
//     if (error instanceof Error) {
//       console.error('[扩展认证] 错误堆栈:', error.stack);
//     }
//     return null;
//   }
// }

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  try {
    // 使用 Supabase Auth 进行登录
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return {
        error: '邮箱或密码不正确，请重试。',
        email,
        password
      };
    }

    // 从数据库获取用户的额外信息
    const userWithExtras = await db
      .select()
      .from(users)
      .where(eq(users.id, authData.user.id))
      .limit(1);

    if (userWithExtras.length === 0) {
      // 如果数据库中没有用户记录，创建一个
      // 获取注册配置
      const registrationConfig = getCachedRegistrationConfig();

      const newUser: NewUser = {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || null,
        role: 'owner',
        premiumRequestsLimit: registrationConfig.userLimits.premiumRequestsLimit,
        fastRequestsUsed: 0,
        fastRequestsLimit: registrationConfig.userLimits.fastRequestsLimit,
      };

      const [createdUser] = await db.insert(users).values(newUser).returning();
      await setSession(createdUser);
    } else {
      await setSession(userWithExtras[0]);
    }

    // 检查是否是扩展授权请求 - 暂时注释掉
    // const extensionAuthState = formData.get('extensionAuthState') as string | null;
    // const extensionRedirectUri = formData.get('extensionRedirectUri') as string | null;

    // console.log(`[扩展认证] 登录处理 - authState: ${extensionAuthState}, redirectUri: ${extensionRedirectUri}`);

    // if (extensionAuthState) {
    //   console.log(`[扩展认证] 开始处理扩展授权请求`);

    //   try {
    //     // 获取扩展认证信息
    //     const extensionAuthInfo = await getExtensionAuthInfo(extensionAuthState);

    //     if (!extensionAuthInfo) {
    //       console.error(`[扩展认证] 获取认证信息失败, authState: ${extensionAuthState}`);
    //       return {
    //         error: '扩展认证失败，请重试。具体错误请查看控制台。',
    //         email,
    //         password,
    //       };
    //     }

    //     console.log(`[扩展认证] 获取认证信息成功:`, extensionAuthInfo);

    //     // 使用提供的重定向URI或从认证信息中获取
    //     const redirectUrl = extensionRedirectUri || extensionAuthInfo.redirectURL;
    //     console.log(`[扩展认证] 使用客户端重定向URL: ${redirectUrl}`);

    //     const user = userWithExtras[0] || (await db.select().from(users).where(eq(users.id, authData.user.id)).limit(1))[0];

    //     // 创建JWT令牌
    //     const token = sign(
    //       {
    //         userId: user.id,
    //         email: user.email,
    //         name: user.name || '',
    //         role: user.role,
    //       },
    //       JWT_SECRET,
    //       { expiresIn: '30d' } // 扩展令牌有效期较长
    //     );

    //     // 对用户数据进行编码以便在URL中传递
    //     const userData = encodeURIComponent(JSON.stringify({
    //       id: user.id,
    //       email: user.email,
    //       name: user.name,
    //       role: user.role,
    //       plan: user.planName,
    //       token: token,
    //     }));

    //     // 获取当前网站基础URL
    //     const baseUrl = getBaseUrl();
    //     const dashboardUrl = `${baseUrl}/dashboard`;

    //     // 构建内部成功页面URL (不使用扩展提供的重定向URL)
    //     const successPageUrl = `${baseUrl}/extension-auth-success?user_data=${userData}&state=${extensionAuthState}&client_redirect=${encodeURIComponent(redirectUrl || '')}&dashboard_url=${encodeURIComponent(dashboardUrl)}`;
    //     console.log(`[扩展认证] 内部成功页面URL: ${successPageUrl}`);

    //     // 不使用redirect函数，而是返回成功数据和重定向URL
    //     // 这里我们已经完成了网站登录，数据包含了dashboardUrl
    //     return {
    //       success: true,
    //       extensionAuth: {
    //         redirectUrl: successPageUrl,
    //         token,
    //         userData: JSON.parse(decodeURIComponent(userData)),
    //         state: extensionAuthState,
    //         dashboardUrl
    //       },
    //       email
    //     };
    //   } catch (error) {
    //     console.error('[扩展认证] 处理认证过程中出错:', error);
    //     return {
    //       error: '扩展认证处理失败，请重试',
    //       email,
    //       password,
    //     };
    //   }
    // }

    // 检查是否是 Tauri 桌面端授权请求
    const tauriAuth = formData.get('tauriAuth');
    if (tauriAuth) {
      // 只需返回 tauriAuth: true，前端会处理跳转
      return {
        success: true,
        tauriAuth: true,
        email
      };
    }

    redirect('/dashboard');
  } catch (error) {
    // 检查是否是 Next.js 的重定向错误，如果是就重新抛出
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }

    console.error('登录错误:', error);
    return {
      error: '登录时发生错误，请重试。',
      email,
      password
    };
  }
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
  turnstileToken: z.string().optional()
});

// Cloudflare Turnstile 验证函数
async function verifyTurnstile(token: string): Promise<boolean> {
  if (!process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
    console.warn('CLOUDFLARE_TURNSTILE_SECRET_KEY not configured, skipping verification');
    return true;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    console.log('Turnstile 验证结果:', data);

    return data.success;
  } catch (error) {
    console.error('Turnstile 验证失败:', error);
    return false;
  }
}

export const signUp = validatedAction(signUpSchema, async (data, formData) => {

  // 按 IP 严格限流（Web 注册入口），依赖 Next.js 请求头
  const { headers } = await import('next/headers');
  const hdrs = await headers();
  const forwardedFor = hdrs.get('x-forwarded-for') || '';
  const realIp = hdrs.get('x-real-ip') || '';
  const clientIp = (forwardedFor.split(',')[0] || realIp || '127.0.0.1').trim();
  const { checkSignupRateLimit } = await import('@/lib/security/rate-limiter');
  const { email, password, inviteId, turnstileToken } = data;
  const rate = await checkSignupRateLimit(clientIp);
  if (!rate.allowed) {
    return {
      error: rate.reason || '注册请求过于频繁，请稍后再试',
      email,
      password
    };
  }

  try {
    // 验证 Turnstile (仅在生产环境或配置了密钥时)
    if (process.env.NODE_ENV === 'production' || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return {
          error: '请完成机器人验证',
          email,
          password
        };
      }

      const isValidTurnstile = await verifyTurnstile(turnstileToken);
      if (!isValidTurnstile) {
        return {
          error: '机器人验证失败，请重试',
          email,
          password
        };
      }
    }

    // 统一采用 Supabase 项目内的邮箱验证策略；此处不再分支 admin.createUser
    // 获取基础URL用于构建重定向链接
    const baseUrl = getBaseUrl();

    // 使用 Supabase Auth 进行注册
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: null // 可以从表单中获取
        },
        // 设置邮箱验证后的重定向URL，直接跳转到注册成功页面
        emailRedirectTo: `${baseUrl}/auth/callback?type=signup&email=${encodeURIComponent(email)}`
      }
    });

    if (authError || !authData.user) {
      return {
        error: authError?.message || '注册失败，请重试。',
        email,
        password
      };
    }

    // 如果需要邮箱验证（Supabase 未返回 session，表示 autoconfirm 关闭）
    if (!authData.session) {
      return {
        success: true,
        emailVerificationRequired: true,
        email,
        message: '注册成功！请检查您的邮箱并点击验证链接来激活账户。'
      };
    }

    // 获取触发器创建的用户记录
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, authData.user.id))
      .limit(1);

    let currentUser;
    if (userRecord.length > 0) {
      currentUser = userRecord[0];
      await setSession(currentUser);
    } else {
      // 如果触发器没有创建记录，手动创建一个
      // 获取注册配置
      const registrationConfig = getCachedRegistrationConfig();

      const newUser: NewUser = {
        id: authData.user.id,
        email: authData.user.email!,
        name: authData.user.user_metadata?.name || null,
        role: 'owner',
        premiumRequestsLimit: registrationConfig.userLimits.premiumRequestsLimit,
        fastRequestsUsed: 0,
        fastRequestsLimit: registrationConfig.userLimits.fastRequestsLimit,
      };

      const [createdUser] = await db.insert(users).values(newUser).returning();
      currentUser = createdUser;
      await setSession(createdUser);
    }

    // 为新用户创建试用API Key - 暂时注释掉
    // try {
    //   console.log(`[注册] 为用户 ${currentUser.id} 创建试用API Key`);
    //   await trialKeyService.createTrialKeyForUser(currentUser.id);
    //   console.log(`[注册] 试用API Key创建成功`);
    // } catch (error) {
    //   console.error(`[注册] 创建试用API Key失败:`, error);
    //   // 不阻止注册流程，只记录错误
    // }

    // 检查是否是扩展授权请求 - 暂时注释掉
    // const extensionAuthState = formData.get('extensionAuthState') as string | null;

    // if (extensionAuthState) {
    //   console.log(`[扩展认证] 开始处理注册后的扩展授权请求, state: ${extensionAuthState}`);

    //   try {
    //     const extensionAuthInfo = await getExtensionAuthInfo(extensionAuthState);

    //     if (!extensionAuthInfo) {
    //       console.error(`[扩展认证] 获取认证信息失败, authState: ${extensionAuthState}`);
    //       return {
    //         error: '扩展认证失败，请重试。具体错误请查看控制台。',
    //         email,
    //         password,
    //       };
    //     }

    //     const redirectUrl = extensionAuthInfo.redirectURL;
    //     const currentUser = userRecord[0] || (await db.select().from(users).where(eq(users.id, authData.user.id)).limit(1))[0];

    //     const token = sign(
    //       {
    //         userId: currentUser.id,
    //         email: currentUser.email,
    //         name: currentUser.name || '',
    //         role: currentUser.role,
    //       },
    //       JWT_SECRET,
    //       { expiresIn: '30d' }
    //     );

    //     const userData = encodeURIComponent(JSON.stringify({
    //       id: currentUser.id,
    //       email: currentUser.email,
    //       name: currentUser.name,
    //       role: currentUser.role,
    //       premiumRequestsUsed: currentUser.premiumRequestsUsed,
    //       premiumRequestsLimit: currentUser.premiumRequestsLimit,
    //       fastRequestsUsed: currentUser.fastRequestsUsed,
    //       fastRequestsLimit: currentUser.fastRequestsLimit
    //     }));

    //     const baseUrl = getBaseUrl();
    //     const dashboardUrl = `${baseUrl}/dashboard`;

    //     const successPageUrl = `${baseUrl}/extension-auth-success?token=${encodeURIComponent(token)}&user_data=${userData}&state=${extensionAuthState}&client_redirect=${encodeURIComponent(redirectUrl || '')}&dashboard_url=${encodeURIComponent(dashboardUrl)}`;

    //     return {
    //       success: true,
    //       extensionAuth: {
    //         redirectUrl: successPageUrl,
    //         token,
    //         userData: JSON.parse(decodeURIComponent(userData)),
    //         state: extensionAuthState,
    //         dashboardUrl
    //       },
    //       email
    //     };
    //   } catch (error) {
    //     console.error('[扩展认证] 处理认证过程中出错:', error);
    //     return {
    //       error: '扩展认证处理失败，请重试',
    //       email,
    //       password
    //     };
    //   }
    // }

    // 检查是否是 Tauri 桌面端授权请求
    const tauriAuth = formData.get('tauriAuth');
    if (tauriAuth) {
      return {
        success: true,
        tauriAuth: true,
        email
      };
    }

    // 当 Supabase 关闭邮箱验证（autoconfirm=ON）时，signUp 会返回有效 session。
    // 此时我们直接引导用户前往 Tauri 的 auth 登录界面以继续桌面端绑定流程。
    redirect('/tauri-auth');
  } catch (e: any) {
    if (e.digest?.startsWith('NEXT_REDIRECT')) {
      throw e;
    }
    console.error('注册错误:', e);
    return {
      error: '创建账户时发生未知错误。',
      email,
      password
    };
  }
});

export async function signOut() {
  // 使用 Supabase Auth 登出
  await supabaseAdmin.auth.signOut();
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password must be different from the current password.'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password and confirmation password do not match.'
      };
    }

    try {
      // 使用 Supabase Auth 更新密码
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword
      });

      if (error) {
        return {
          currentPassword,
          newPassword,
          confirmPassword,
          error: 'Failed to update password: ' + error.message
        };
      }

      return {
        success: 'Password updated successfully.'
      };
    } catch (error) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Failed to update password.'
      };
    }
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    try {
      // 使用 Supabase Auth 删除用户
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

      if (error) {
        return {
          password,
          error: 'Failed to delete account: ' + error.message
        };
      }

      // Soft delete in our database
      await db
        .update(users)
        .set({
          deletedAt: sql`CURRENT_TIMESTAMP`,
          email: sql`CONCAT(email, '-', id, '-deleted')` // Ensure email uniqueness
        })
        .where(eq(users.id, user.id));

      (await cookies()).delete('session');
      redirect('/sign-in');
    } catch (error) {
      return {
        password,
        error: 'Account deletion failed.'
      };
    }
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;

    try {
      // 更新 Supabase Auth 用户信息
      const { error: authError } = await supabaseAdmin.auth.updateUser({
        email: email,
        data: { name }
      });

      if (authError) {
        return {
          name,
          email,
          error: 'Failed to update account: ' + authError.message
        };
      }

      // 更新本地数据库
      await db.update(users).set({ name, email }).where(eq(users.id, user.id));

      return { name, success: 'Account updated successfully.' };
    } catch (error) {
      return {
        name,
        email,
        error: 'Failed to update account.'
      };
    }
  }
);
