// 简单的内存速率限制器
// 在生产环境中建议使用Redis

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 每5分钟清理过期的条目
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * 检查是否超过速率限制
   * @param key 限制键（通常是用户ID）
   * @param limit 限制次数
   * @param windowMs 时间窗口（毫秒）
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // 新的时间窗口
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs
      };
      this.store.set(key, newEntry);

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: newEntry.resetTime
      };
    }

    if (entry.count >= limit) {
      // 超过限制
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // 增加计数
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * 重置特定键的限制
   */
  reset(key: string) {
    this.store.delete(key);
  }

  /**
   * 获取当前状态
   */
  getStatus(key: string) {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return {
      count: entry.count,
      resetTime: entry.resetTime,
      remaining: Math.max(0, entry.resetTime - now)
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// 全局实例

// 注册速率限制（按 IP），优先使用 Redis，回退到内存
import redis, { redisCache } from '@/lib/redis';

/**
 * 严格注册限流：
 * - 每 IP 5 分钟内最多 1 次（防突发）
 * - 每 IP 24 小时最多 N 次（默认 3，理论上应为 1，允许少量超额）
 * 可通过环境变量覆盖：
 *   SIGNUP_BURST_LIMIT (默认1)
 *   SIGNUP_BURST_WINDOW_SEC (默认300=5min)
 *   SIGNUP_DAILY_LIMIT (默认3)
 *   SIGNUP_DAILY_WINDOW_SEC (默认86400)
 */
export async function checkSignupRateLimit(clientIP: string): Promise<{
  allowed: boolean;
  reason?: string;
  remainingDaily?: number;
  remainingBurst?: number;
  resetDaily?: number;
  resetBurst?: number;
}> {
  const BURST_LIMIT = parseInt(process.env.SIGNUP_BURST_LIMIT || '1', 10);
  const BURST_WINDOW = parseInt(process.env.SIGNUP_BURST_WINDOW_SEC || '300', 10); // 5min
  const DAILY_LIMIT = parseInt(process.env.SIGNUP_DAILY_LIMIT || '3', 10);
  const DAILY_WINDOW = parseInt(process.env.SIGNUP_DAILY_WINDOW_SEC || '86400', 10); // 24h

  const useRedis = redisCache.isAvailable();

  // Redis 实现
  if (useRedis) {
    try {
      const burstKey = `signup:${clientIP}:burst`;
      const dayKey = `signup:${clientIP}:day`;

      // 突发窗口：INCR + 首次设置过期
      const burstCount = await (async () => {
        const val = await redis.incr(burstKey);
        if (val === 1) {
          // 首次出现，设置过期
          await redis.expire(burstKey, BURST_WINDOW);
        }
        return val as number;
      })();

      if (burstCount > BURST_LIMIT) {
        // 获取剩余 TTL（近似复位时间）
        const burstTtl = await redis.ttl(burstKey);
        return {
          allowed: false,
          reason: '请求过于频繁，请稍后再试',
          remainingBurst: Math.max(0, BURST_LIMIT - burstCount),
          resetBurst: burstTtl > 0 ? Date.now() + burstTtl * 1000 : undefined,
        };
      }

      // 每日窗口：INCR + 首次设置过期
      const dayCount = await (async () => {
        const val = await redis.incr(dayKey);
        if (val === 1) {
          await redis.expire(dayKey, DAILY_WINDOW);
        }
        return val as number;
      })();

      if (dayCount > DAILY_LIMIT) {
        const dayTtl = await redis.ttl(dayKey);
        return {
          allowed: false,
          reason: '该IP今日注册次数已达上限',
          remainingDaily: Math.max(0, DAILY_LIMIT - dayCount),
          resetDaily: dayTtl > 0 ? Date.now() + dayTtl * 1000 : undefined,
        };
      }

      return {
        allowed: true,
        remainingBurst: Math.max(0, BURST_LIMIT - burstCount),
        remainingDaily: Math.max(0, DAILY_LIMIT - dayCount),
      };
    } catch (e) {
      // Redis 出错时回退到内存
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[RateLimiter] Redis error, fallback to memory:', e);
      }
    }
  }

  // 内存回退实现：使用现有 rateLimiter
  const now = Date.now();
  const burstKeyMem = `signup_burst:${clientIP}`;
  const dayKeyMem = `signup_day:${clientIP}`;

  const burstRes = rateLimiter.check(burstKeyMem, BURST_LIMIT, BURST_WINDOW * 1000);
  if (!burstRes.allowed) {
    return {
      allowed: false,
      reason: '请求过于频繁，请稍后再试',
      remainingBurst: burstRes.remaining,
      resetBurst: burstRes.resetTime,
    };
  }

  const dayRes = rateLimiter.check(dayKeyMem, DAILY_LIMIT, DAILY_WINDOW * 1000);
  if (!dayRes.allowed) {
    return {
      allowed: false,
      reason: '该IP今日注册次数已达上限',
      remainingDaily: dayRes.remaining,
      resetDaily: dayRes.resetTime,
    };
  }

  return {
    allowed: true,
    remainingBurst: burstRes.remaining,
    remainingDaily: dayRes.remaining,
  };
}

const rateLimiter = new MemoryRateLimiter();

/**
 * 管理员操作速率限制
 */
export async function checkAdminRateLimit(
  adminUserId: string,
  action: string = 'general'
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}> {
  // 不同操作的限制配置
  const limits = {
    general: { limit: 100, windowMs: 60 * 60 * 1000 }, // 每小时100次一般操作
    delete: { limit: 20, windowMs: 60 * 60 * 1000 },   // 每小时20次删除操作
    batch: { limit: 10, windowMs: 60 * 60 * 1000 },    // 每小时10次批量操作
  };

  const config = limits[action as keyof typeof limits] || limits.general;
  const key = `admin:${adminUserId}:${action}`;

  const result = rateLimiter.check(key, config.limit, config.windowMs);

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime);
    return {
      ...result,
      message: `操作频率过高，请在 ${resetDate.toLocaleTimeString()} 后重试`
    };
  }

  return result;
}

/**
 * 重置管理员速率限制
 */
export function resetAdminRateLimit(adminUserId: string, action: string = 'general') {
  const key = `admin:${adminUserId}:${action}`;
  rateLimiter.reset(key);
}

/**
 * 获取管理员当前限制状态
 */
export function getAdminRateLimitStatus(adminUserId: string, action: string = 'general') {
  const key = `admin:${adminUserId}:${action}`;
  return rateLimiter.getStatus(key);
}

/**
 * 预检 API 速率限制
 */
export async function checkPreflightRateLimit(
  userId: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}> {
  // 预检 API 限制：每分钟最多 5 次，每小时最多 30 次
  const minuteKey = `preflight:${userId}:minute`;
  const hourKey = `preflight:${userId}:hour`;

  // 检查分钟级限制
  const minuteResult = rateLimiter.check(minuteKey, 5, 60 * 1000);
  if (!minuteResult.allowed) {
    return {
      ...minuteResult,
      message: '预检请求过于频繁，请稍后重试'
    };
  }

  // 检查小时级限制
  const hourResult = rateLimiter.check(hourKey, 30, 60 * 60 * 1000);
  if (!hourResult.allowed) {
    const resetDate = new Date(hourResult.resetTime);
    return {
      ...hourResult,
      message: `预检请求已达小时限制，请在 ${resetDate.toLocaleTimeString()} 后重试`
    };
  }

  return minuteResult; // 返回更严格的限制
}

/**
 * 用户会话预热速率限制
 */
export async function checkUserWarmupRateLimit(
  userId: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}> {
  // 用户预热限制：每 5 分钟最多 3 次
  const key = `user_warmup:${userId}`;
  const result = rateLimiter.check(key, 3, 5 * 60 * 1000);

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime);
    return {
      ...result,
      message: `用户预热请求过于频繁，请在 ${resetDate.toLocaleTimeString()} 后重试`
    };
  }

  return result;
}

/**
 * 全局 API 速率限制（按 IP）
 */
export async function checkGlobalRateLimit(
  clientIP: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}> {
  // 全局限制：每分钟最多 60 次请求
  const key = `global:${clientIP}`;
  const result = rateLimiter.check(key, 60, 60 * 1000);

  if (!result.allowed) {
    return {
      ...result,
      message: '请求过于频繁，请稍后重试'
    };
  }

  return result;
}

export { rateLimiter };
