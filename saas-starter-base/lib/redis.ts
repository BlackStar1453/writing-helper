import { Redis } from '@upstash/redis';

// 检查必需的环境变量
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('⚠️  Upstash Redis 环境变量未配置，缓存功能将被禁用');
}

// 创建单例Redis客户端实例
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  // 配置重试和超时
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.exp(retryCount) * 50, // 指数退避
  },
  // 请求超时设置
  automaticDeserialization: true,
});

// 缓存键前缀
export const CACHE_KEYS = {
  USER_USAGE: 'user:usage:',
  USER_AUTH: 'user:auth:',
  USER_PROFILE: 'user:profile:',
  RATE_LIMIT: 'rate_limit:',
  SESSION: 'session:',
  TEMP_DATA: 'temp:',
  // Pricing相关缓存
  PRICING_STRIPE_PRICES: 'pricing:stripe:prices',
  PRICING_STRIPE_PRODUCTS: 'pricing:stripe:products',
  PRICING_XORPAY_PRODUCTS: 'pricing:xorpay:products',
  PRICING_ACTIVE_PROMOTIONS: 'pricing:promotions:active',
  PRICING_COMPLETE_DATA: 'pricing:complete:data',
} as const;

// 缓存过期时间（秒）- 支持环境变量配置
export const CACHE_TTL = {
  // 使用量相关 - 可通过环境变量配置，默认1周以减少数据库查询
  USER_USAGE: parseInt(process.env.CACHE_TTL_USER_USAGE || '604800'),           // 默认1周 - 使用量信息
  USER_USAGE_BUFFER: parseInt(process.env.CACHE_TTL_USER_USAGE_BUFFER || '604800'),    // 默认1周 - 使用量缓冲区

  // 用户信息 - 长缓存，低频变化
  USER_AUTH: 3600,           // 1小时 - 认证信息
  USER_PROFILE: 7200,        // 2小时 - 用户资料
  USER_SUBSCRIPTION: 1800,   // 30分钟 - 订阅状态

  // 系统配置 - 超长缓存，极少变化
  MODEL_INFO: 86400,         // 24小时 - 模型信息
  SYSTEM_CONFIG: 43200,      // 12小时 - 系统配置

  // Pricing相关 - 长期缓存，价格很少变化
  PRICING_STRIPE_PRICES: parseInt(process.env.CACHE_TTL_PRICING_STRIPE || '86400'),     // 默认24小时 - Stripe价格
  PRICING_STRIPE_PRODUCTS: parseInt(process.env.CACHE_TTL_PRICING_PRODUCTS || '172800'), // 默认48小时 - Stripe产品
  PRICING_XORPAY_PRODUCTS: parseInt(process.env.CACHE_TTL_PRICING_XORPAY || '172800'),  // 默认48小时 - Xorpay产品
  PRICING_ACTIVE_PROMOTIONS: parseInt(process.env.CACHE_TTL_PRICING_PROMOTIONS || '3600'), // 默认1小时 - 活跃促销
  PRICING_COMPLETE_DATA: parseInt(process.env.CACHE_TTL_PRICING_COMPLETE || '43200'),   // 默认12小时 - 完整定价数据

  // 会话和临时数据
  SESSION: 86400,            // 24小时 - 会话信息
  RATE_LIMIT: 3600,          // 1小时 - 速率限制
  TEMP_DATA: 60,             // 1分钟 - 临时数据
} as const;

// Redis 工具类
export class RedisCache {
  private static instance: RedisCache;
  private redis: Redis;
  private isEnabled: boolean;

  constructor() {
    this.redis = redis;
    this.isEnabled = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  }

  static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache();
    }
    return RedisCache.instance;
  }

  /**
   * 检查 Redis 是否可用
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      // 添加超时保护
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 5000); // 5秒超时
      });

      const setPromise = (async () => {
        if (ttl) {
          await this.redis.setex(key, ttl, JSON.stringify(value));
        } else {
          await this.redis.set(key, JSON.stringify(value));
        }
        return true;
      })();

      return await Promise.race([setPromise, timeoutPromise]);
    } catch (error) {
      // 静默处理Redis错误，避免影响PPR
      if (process.env.NODE_ENV === 'development') {
        console.warn('Redis set 警告:', error);
      }
      return false;
    }
  }

  /**
   * 获取缓存
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isEnabled) return null;

    try {
      // 添加超时保护，避免长时间等待
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 5000); // 5秒超时
      });

      const getPromise = this.redis.get(key);
      const value = await Promise.race([getPromise, timeoutPromise]);

      if (value === null) return null;

      // 如果是字符串，尝试解析 JSON
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      }

      return value as T;
    } catch (error) {
      // 静默处理Redis错误，避免影响PPR
      if (process.env.NODE_ENV === 'development') {
        console.warn('Redis get 警告:', error);
      }
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Redis del 错误:', error);
      return false;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists 错误:', error);
      return false;
    }
  }

  /**
   * 获取匹配模式的所有键
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.isEnabled) return [];

    try {
      const keys = await this.redis.keys(pattern);
      return Array.isArray(keys) ? keys : [];
    } catch (error) {
      console.error('Redis keys 错误:', error);
      return [];
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      await this.redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis expire 错误:', error);
      return false;
    }
  }

  /**
   * 批量删除匹配的键
   * 注意：Upstash Redis 不支持 SCAN，此方法仅为接口兼容性保留
   */
  async deletePattern(_pattern: string): Promise<number> {
    if (!this.isEnabled) return 0;

    try {
      // 注意：Upstash Redis 不支持 SCAN，所以这里使用简单的删除方式
      // 在生产环境中，建议使用具体的键名而不是模式匹配
      console.warn('Upstash Redis 不支持模式匹配删除，请使用具体的键名');
      return 0;
    } catch (error) {
      console.error('Redis deletePattern 错误:', error);
      return 0;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const testKey = 'health_check_' + Date.now();
      await this.redis.set(testKey, 'ok');
      const result = await this.redis.get(testKey);
      await this.redis.del(testKey);
      return result === 'ok';
    } catch (error) {
      console.error('Redis 健康检查失败:', error);
      return false;
    }
  }

  /**
   * Ping Redis 服务器
   */
  async ping(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      // Upstash Redis 支持 ping 命令
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping 失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const redisCache = RedisCache.getInstance();

// 导出原始 Redis 客户端（向后兼容）
export default redis;