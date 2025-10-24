# Tauri 认证所需的 API 端点

## 新增 API 端点

### 1. Tauri 登录端点

```typescript
// src/app/api/tauri-auth/login/route.ts
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

    // 使用 Supabase Auth 进行登录验证
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({
        success: false,
        error: '邮箱或密码不正确'
      }, { status: 401 });
    }

    // 从数据库获取用户的额外信息
    const userWithExtras = await db
      .select()
      .from(users)
      .where(eq(users.id, authData.user.id))
      .limit(1);

    if (userWithExtras.length === 0) {
      return NextResponse.json({
        success: false,
        error: '用户信息不存在'
      }, { status: 404 });
    }

    const user = userWithExtras[0];

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

    // 组装用户数据
    const userData = {
      id: user.id,
      email: user.email,
      plan: user.planName,
      subscription_status: user.subscriptionStatus,
      subscription_interval: user.subscriptionInterval,
      subscription_expires_at: processedExpiresAt,
      premium_type: user.premiumType || null,
    };

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
```

### 2. Tauri 注册端点

```typescript
// src/app/api/tauri-auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db/drizzle';
import { users, NewUser } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCachedRegistrationConfig } from '@/lib/config/registration';

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

    // 使用 Supabase Auth 进行注册
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: null
        }
      }
    });

    if (authError) {
      let errorMessage = '注册失败';
      if (authError.message.includes('already registered')) {
        errorMessage = '该邮箱已被注册';
      } else if (authError.message.includes('password')) {
        errorMessage = '密码格式不正确';
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({
        success: false,
        error: '注册失败，请重试'
      }, { status: 400 });
    }

    // 检查用户是否已存在于数据库
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, authData.user.id))
      .limit(1);

    if (existingUser.length === 0) {
      // 创建新用户记录
      const registrationConfig = getCachedRegistrationConfig();

      const newUser: NewUser = {
        id: authData.user.id,
        email: email,
        name: authData.user.user_metadata?.name || null,
        role: 'owner',
        premiumRequestsLimit: registrationConfig.userLimits.premiumRequestsLimit,
        fastRequestsUsed: 0,
        fastRequestsLimit: registrationConfig.userLimits.fastRequestsLimit,
      };

      await db.insert(users).values(newUser);
    }

    // 注册成功，但需要邮箱验证
    return NextResponse.json({
      success: true,
      message: '注册成功，请检查邮箱并点击验证链接完成注册',
      requires_verification: true
    });

  } catch (error) {
    console.error('[Tauri Register API] 错误:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}
```

### 3. 令牌验证端点

```typescript
// src/app/api/tauri-auth/verify-token/route.ts
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

    // 验证JWT令牌
    let decoded;
    try {
      decoded = verify(token, JWT_SECRET) as { userId: string; email: string; exp: number };
    } catch (error) {
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
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    const user = userRecord[0];

    // 处理订阅过期时间
    let processedExpiresAt = null;
    if (user.subscriptionExpiresAt) {
      processedExpiresAt = user.subscriptionExpiresAt instanceof Date 
        ? user.subscriptionExpiresAt.toISOString()
        : user.subscriptionExpiresAt;
    }

    // 返回用户数据
    const userData = {
      id: user.id,
      email: user.email,
      plan: user.planName,
      subscription_status: user.subscriptionStatus,
      subscription_interval: user.subscriptionInterval,
      subscription_expires_at: processedExpiresAt,
      premium_type: user.premiumType || null,
    };

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
```

### 4. 用户信息刷新端点

```typescript
// src/app/api/tauri-auth/refresh-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.AUTH_SECRET || 'default_secret_change_this';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: '缺少认证令牌'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // 验证JWT令牌
    let decoded;
    try {
      decoded = verify(token, JWT_SECRET) as { userId: string; email: string; exp: number };
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: '令牌无效或已过期'
      }, { status: 401 });
    }

    // 获取最新用户信息
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (userRecord.length === 0) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    const user = userRecord[0];

    // 处理订阅过期时间
    let processedExpiresAt = null;
    if (user.subscriptionExpiresAt) {
      processedExpiresAt = user.subscriptionExpiresAt instanceof Date 
        ? user.subscriptionExpiresAt.toISOString()
        : user.subscriptionExpiresAt;
    }

    // 返回最新用户数据
    const userData = {
      id: user.id,
      email: user.email,
      plan: user.planName,
      subscription_status: user.subscriptionStatus,
      subscription_interval: user.subscriptionInterval,
      subscription_expires_at: processedExpiresAt,
      premium_type: user.premiumType || null,
    };

    return NextResponse.json({
      success: true,
      user_data: userData
    });

  } catch (error) {
    console.error('[Tauri Refresh User API] 错误:', error);
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 });
  }
}
```

## API 端点总结

| 端点 | 方法 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| `/api/tauri-auth/login` | POST | 用户登录 | `{email, password}` | `{success, user_data?, token?, error?}` |
| `/api/tauri-auth/register` | POST | 用户注册 | `{email, password}` | `{success, message?, requires_verification?, error?}` |
| `/api/tauri-auth/verify-token` | POST | 验证令牌 | `{token}` | `{success, user_data?, valid?, error?}` |
| `/api/tauri-auth/refresh-user` | POST | 刷新用户信息 | Header: `Authorization: Bearer <token>` | `{success, user_data?, error?}` |

## 错误处理

所有API端点都返回统一的错误格式：
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

## 安全考虑

1. **输入验证**: 所有端点都进行严格的输入验证
2. **JWT安全**: 使用强密钥签名JWT令牌
3. **错误信息**: 不泄露敏感的系统信息
4. **速率限制**: 建议在生产环境中添加速率限制
5. **HTTPS**: 确保所有请求使用HTTPS传输
