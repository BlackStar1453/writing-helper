import { NextRequest, NextResponse } from 'next/server';
import { trialKeyService } from '@/lib/services/trial-key.service';

export async function GET(request: NextRequest) {
  try {
    console.log('[Cleanup Trial Keys Cron] 开始清理过期的试用API Key');
    
    // 验证cron请求（可选：添加secret验证）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cleanup Trial Keys Cron] 未授权的cron请求');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 执行清理任务
    await trialKeyService.checkAndExpireKeys();
    
    console.log('[Cleanup Trial Keys Cron] 试用Key清理任务完成');

    return NextResponse.json({
      success: true,
      message: 'Trial keys cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cleanup Trial Keys Cron] 清理试用Key失败:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to cleanup trial keys',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
