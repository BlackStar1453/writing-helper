import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { setSession } from '@/lib/auth/session';
import { trialKeyService } from '@/lib/services/trial-key.service';

export async function POST(request: NextRequest) {
  try {
    console.log('[Set Session API] 收到session设置请求');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Set Session API] 缺少authorization header');
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('[Set Session API] 验证token...');
    
    // 验证 token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[Set Session API] Token验证失败:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('[Set Session API] Token验证成功，用户ID:', user.id);
    
    const requestBody = await request.json();
    const { userId } = requestBody;

    console.log('[Set Session API] 查询用户记录...');
    
    // 查询用户记录
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      console.error('[Set Session API] 用户记录不存在:', userId);
      return NextResponse.json({ 
        error: 'User record not found', 
        details: 'Please wait a moment for user creation to complete' 
      }, { status: 404 });
    }

    const userRecord = existingUser[0];
    console.log('[Set Session API] 找到用户记录:', userRecord.id);

    // 检查并创建试用API Key（如果不存在）- 暂时注释掉
    // try {
    //   console.log('[Set Session API] 检查试用API Key...');
    //   const existingTrialKey = await trialKeyService.getTrialKeyInfo(userRecord.id);

    //   if (!existingTrialKey) {
    //     console.log('[Set Session API] 用户没有试用API Key，开始创建...');
    //     const trialApiKey = await trialKeyService.createTrialKeyForUser(userRecord.id);
    //     console.log('[Set Session API] 试用API Key创建成功:', trialApiKey.substring(0, 20) + '...');
    //   } else {
    //     console.log('[Set Session API] 用户已有试用API Key，跳过创建');
    //   }
    // } catch (trialKeyError) {
    //   console.error('[Set Session API] 试用API Key处理失败:', trialKeyError);
    //   // 不阻止session设置，只记录错误
    // }

    console.log('[Set Session API] 设置应用session...');

    // 设置应用session
    await setSession(userRecord);

    console.log('[Set Session API] Session设置成功');
    
    return NextResponse.json({ 
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name
      }
    });
  } catch (error) {
    console.error('[Set Session API] 设置session失败:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to set session',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to set session',
        details: 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 