import { NextRequest, NextResponse } from 'next/server';
import { redisCache } from '@/lib/redis';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { getClientFriendlyCorsHeaders, handleCorsOptions } from '@/lib/config/cors';

// 处理 OPTIONS 请求
export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

/**
 * 健康检查 API
 * 客户端可以用来检测服务器状态
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const corsHeaders = getClientFriendlyCorsHeaders();
  
  try {
    // 并行检查各个组件的健康状态
    const healthChecks = await Promise.allSettled([
      checkRedisHealth(),
      checkDatabaseHealth(),
      checkSystemHealth()
    ]);

    const [redisResult, dbResult, systemResult] = healthChecks;
    
    const responseTime = Date.now() - startTime;
    
    // 分析健康检查结果
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: responseTime,
      services: {
        redis: {
          status: redisResult.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          responseTime: redisResult.status === 'fulfilled' ? redisResult.value.responseTime : null,
          error: redisResult.status === 'rejected' ? redisResult.reason?.message : null
        },
        database: {
          status: dbResult.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          responseTime: dbResult.status === 'fulfilled' ? dbResult.value.responseTime : null,
          error: dbResult.status === 'rejected' ? dbResult.reason?.message : null
        },
        system: {
          status: systemResult.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          ...systemResult.status === 'fulfilled' ? systemResult.value : {}
        }
      }
    };

    // 如果任何关键服务不健康，整体状态为不健康
    const criticalServices = ['redis', 'database'];
    const hasUnhealthyService = criticalServices.some(
      service => health.services[service as keyof typeof health.services].status === 'unhealthy'
    );

    if (hasUnhealthyService) {
      health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(health, { 
      status: statusCode,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('健康检查失败:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        redis: { status: 'unknown' },
        database: { status: 'unknown' },
        system: { status: 'unknown' }
      }
    }, { 
      status: 503,
      headers: corsHeaders 
    });
  }
}

/**
 * 检查 Redis 健康状态
 */
async function checkRedisHealth(): Promise<{ responseTime: number }> {
  const startTime = Date.now();
  
  try {
    // 使用简单的 set/get 操作来测试 Redis 连接
    await redisCache.set('health_check', 'ok', 1);
    return { responseTime: Date.now() - startTime };
  } catch (error) {
    throw new Error(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 检查数据库健康状态
 */
async function checkDatabaseHealth(): Promise<{ responseTime: number }> {
  const startTime = Date.now();
  
  try {
    // 执行一个简单的查询
    await db.select({ id: users.id }).from(users).limit(1);
    return { responseTime: Date.now() - startTime };
  } catch (error) {
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 检查系统健康状态
 */
async function checkSystemHealth(): Promise<{
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  nodeVersion: string;
}> {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.rss + memoryUsage.heapTotal + memoryUsage.external;
  
  return {
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round((memoryUsage.heapUsed / totalMemory) * 100)
    },
    nodeVersion: process.version
  };
}
