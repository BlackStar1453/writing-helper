import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db, checkDatabaseConnection } from '@/lib/db/drizzle';
import { users, NewUser } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { setSession } from '@/lib/auth/session';
import { trialKeyService } from '@/lib/services/trial-key.service';
import { getCachedRegistrationConfig } from '@/lib/config/registration';

// 创建一个带超时的Promise包装器
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} 超时 (${timeoutMs}ms)`)), timeoutMs)
    )
  ]);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('=====================================');
    console.log('[Sync User API] 收到用户同步请求');
    console.log('[Sync User API] 请求时间:', new Date().toISOString());
    console.log('[Sync User API] 请求方法:', request.method);
    console.log('[Sync User API] 请求URL:', request.url);
    console.log('[Sync User API] 请求头:', Object.fromEntries(request.headers.entries()));
    
    // 首先检查数据库连接健康状态
    console.log('[Sync User API] 检查数据库连接健康状态...');
    const healthCheckStart = Date.now();
    try {
      const healthResult = await withTimeout(
        checkDatabaseConnection(), 
        5000, 
        '数据库健康检查'
      );
      const healthCheckEnd = Date.now();
      console.log('[Sync User API] 数据库健康检查结果:', healthResult);
      console.log('[Sync User API] 健康检查耗时:', healthCheckEnd - healthCheckStart, 'ms');
      
      if (!healthResult.healthy) {
        throw new Error(`数据库不健康: ${healthResult.error}`);
      }
    } catch (healthError) {
      console.error('[Sync User API] 数据库健康检查失败:', healthError);
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: healthError instanceof Error ? healthError.message : 'Database health check failed',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Sync User API] 缺少authorization header');
      console.error('[Sync User API] 收到的headers:', Object.fromEntries(request.headers.entries()));
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('[Sync User API] Token验证中...');
    console.log('[Sync User API] Token (前50字符):', token.substring(0, 50));
    
    // 验证 token
    const tokenValidationStart = Date.now();
    const { data: { user }, error: authError } = await withTimeout(
      supabaseAdmin.auth.getUser(token),
      10000,
      'Token验证'
    );
    const tokenValidationEnd = Date.now();
    
    console.log('[Sync User API] Token验证耗时:', tokenValidationEnd - tokenValidationStart, 'ms');
    
    if (authError || !user) {
      console.error('[Sync User API] Token验证失败:', authError);
      console.error('[Sync User API] 错误详情:', authError?.message, authError?.status);
      return NextResponse.json({ error: 'Invalid token', details: authError?.message }, { status: 401 });
    }

    console.log('[Sync User API] Token验证成功，用户ID:', user.id);
    console.log('[Sync User API] 用户邮箱:', user.email);
    console.log('[Sync User API] 用户元数据:', user.user_metadata);
    
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('[Sync User API] 请求体解析成功:', requestBody);
    } catch (parseError) {
      console.error('[Sync User API] 请求体解析失败:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
    const { userId, email, name } = requestBody;

    console.log('[Sync User API] 提取的数据:', { userId, email, name });
    console.log('[Sync User API] 检查用户是否已存在...');
    
    // 检查用户是否已存在 - 添加超时处理
    const dbQueryStart = Date.now();
    let existingUser;
    try {
      console.log('[Sync User API] 开始数据库查询，查找用户ID:', userId);
      existingUser = await withTimeout(
        db.select().from(users).where(eq(users.id, userId)).limit(1),
        15000,  // 15秒超时
        '用户查询'
      );
      const dbQueryEnd = Date.now();
      console.log('[Sync User API] 数据库查询完成，耗时:', dbQueryEnd - dbQueryStart, 'ms');
      console.log('[Sync User API] 数据库查询结果:', existingUser.length > 0 ? '用户已存在' : '用户不存在');
    } catch (queryError) {
      console.error('[Sync User API] 数据库查询失败:', queryError);
      console.error('[Sync User API] 查询耗时:', Date.now() - dbQueryStart, 'ms');
      
      return NextResponse.json(
        { 
          error: 'Database query failed',
          details: queryError instanceof Error ? queryError.message : 'Unknown database error',
          operation: 'user_lookup',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    let userRecord;
    
    if (existingUser.length === 0) {
      console.log('[Sync User API] 创建新用户记录...');
      
      // 创建新用户记录 - 使用环境变量配置
      const registrationConfig = getCachedRegistrationConfig();

      const newUser: NewUser = {
        id: userId,
        email: email,
        name: name,
        role: 'owner',
        premiumRequestsLimit: registrationConfig.userLimits.premiumRequestsLimit,
        fastRequestsUsed: 0,
        fastRequestsLimit: registrationConfig.userLimits.fastRequestsLimit,
      };

      console.log('[Sync User API] 新用户数据:', newUser);
      
      try {
        const dbInsertStart = Date.now();
        console.log('[Sync User API] 开始插入新用户记录...');
        const [createdUser] = await withTimeout(
          db.insert(users).values(newUser).returning(),
          10000,  // 10秒超时
          '用户创建'
        );
        const dbInsertEnd = Date.now();
        
        userRecord = createdUser;
        console.log('[Sync User API] 创建新用户记录成功:', userId);
        console.log('[Sync User API] 数据库插入耗时:', dbInsertEnd - dbInsertStart, 'ms');
        console.log('[Sync User API] 创建的用户记录:', userRecord);

        // 为新用户创建试用API Key - 暂时注释掉
        // console.log('[Sync User API] 为新用户创建试用API Key...');
        // try {
        //   const trialKeyStart = Date.now();
        //   const trialApiKey = await withTimeout(
        //     trialKeyService.createTrialKeyForUser(userId),
        //     15000,  // 15秒超时
        //     '试用API Key创建'
        //   );
        //   const trialKeyEnd = Date.now();

        //   console.log('[Sync User API] 试用API Key创建成功');
        //   console.log('[Sync User API] 试用Key创建耗时:', trialKeyEnd - trialKeyStart, 'ms');
        //   console.log('[Sync User API] 试用Key (前20字符):', trialApiKey.substring(0, 20));
        // } catch (trialKeyError) {
        //   // 试用Key创建失败不应该阻止用户注册，只记录错误
        //   console.error('[Sync User API] 试用API Key创建失败:', trialKeyError);
        //   console.error('[Sync User API] 试用Key错误详情:', trialKeyError instanceof Error ? trialKeyError.message : trialKeyError);
        //   // 不返回错误，继续用户注册流程
        // }
      } catch (insertError) {
        console.error('[Sync User API] 插入用户记录失败:', insertError);
        console.error('[Sync User API] 插入错误详情:', insertError instanceof Error ? insertError.message : insertError);
        console.error('[Sync User API] 插入错误堆栈:', insertError instanceof Error ? insertError.stack : '无堆栈信息');
        
        return NextResponse.json(
          { 
            error: 'Failed to create user',
            details: insertError instanceof Error ? insertError.message : 'Unknown insert error',
            operation: 'user_creation',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }
    } else {
      userRecord = existingUser[0];
      console.log('[Sync User API] 用户记录已存在:', userId);
      console.log('[Sync User API] 现有用户记录:', userRecord);

      // 为已存在的用户检查并创建试用API Key（如果没有）- 暂时注释掉
      // console.log('[Sync User API] 检查现有用户的试用API Key...');
      // try {
      //   const existingTrialKey = await trialKeyService.getTrialKeyInfo(userId);

      //   if (!existingTrialKey) {
      //     console.log('[Sync User API] 现有用户没有试用API Key，开始创建...');
      //     const trialKeyStart = Date.now();
      //     const trialApiKey = await withTimeout(
      //       trialKeyService.createTrialKeyForUser(userId),
      //       15000,  // 15秒超时
      //       '试用API Key创建'
      //     );
      //     const trialKeyEnd = Date.now();

      //     console.log('[Sync User API] 为现有用户创建试用API Key成功');
      //     console.log('[Sync User API] 试用Key创建耗时:', trialKeyEnd - trialKeyStart, 'ms');
      //     console.log('[Sync User API] 试用Key (前20字符):', trialApiKey.substring(0, 20));
      //   } else {
      //     console.log('[Sync User API] 现有用户已有试用API Key，跳过创建');
      //   }
      // } catch (trialKeyError) {
      //   console.error('[Sync User API] 为现有用户创建试用API Key失败:', trialKeyError);
      //   console.error('[Sync User API] 试用Key错误详情:', trialKeyError instanceof Error ? trialKeyError.message : trialKeyError);
      //   // 不返回错误，继续用户同步流程
      // }
    }

    console.log('[Sync User API] 设置session cookie...');
    
    // 设置我们的session cookie
    try {
      const sessionStart = Date.now();
      await withTimeout(
        setSession(userRecord),
        5000,
        'Session设置'
      );
      const sessionEnd = Date.now();
      
      console.log('[Sync User API] Session cookie 已设置成功');
      console.log('[Sync User API] Session设置耗时:', sessionEnd - sessionStart, 'ms');
    } catch (sessionError) {
      console.error('[Sync User API] 设置session失败:', sessionError);
      console.error('[Sync User API] Session错误详情:', sessionError instanceof Error ? sessionError.message : sessionError);
      console.error('[Sync User API] Session错误堆栈:', sessionError instanceof Error ? sessionError.stack : '无堆栈信息');
      
      return NextResponse.json(
        { 
          error: 'Failed to set session',
          details: sessionError instanceof Error ? sessionError.message : 'Unknown session error',
          operation: 'session_creation',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    const endTime = Date.now();
    console.log('[Sync User API] 用户同步完成，返回成功响应');
    console.log('[Sync User API] 总耗时:', endTime - startTime, 'ms');
    console.log('=====================================');
    
    return NextResponse.json({ 
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name
      },
      timing: {
        total: endTime - startTime,
        tokenValidation: tokenValidationEnd - tokenValidationStart,
        dbQuery: Date.now() - dbQueryStart,
      }
    });
  } catch (error) {
    const endTime = Date.now();
    console.error('=====================================');
    console.error('[Sync User API] 同步用户数据失败:', error);
    console.error('[Sync User API] 错误发生时间:', new Date().toISOString());
    console.error('[Sync User API] 处理耗时:', endTime - startTime, 'ms');
    
    // 提供更详细的错误信息
    if (error instanceof Error) {
      console.error('[Sync User API] 错误类型:', error.constructor.name);
      console.error('[Sync User API] 错误详情:', error.message);
      console.error('[Sync User API] 错误堆栈:', error.stack);
      
      return NextResponse.json(
        { 
          error: 'Failed to sync user data',
          details: error.message,
          errorType: error.constructor.name,
          timestamp: new Date().toISOString(),
          timing: endTime - startTime
        },
        { status: 500 }
      );
    }
    
    console.error('[Sync User API] 未知错误类型:', typeof error, error);
    console.error('=====================================');
    
    return NextResponse.json(
      { 
        error: 'Failed to sync user data',
        details: 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        timing: endTime - startTime
      },
      { status: 500 }
    );
  }
} 