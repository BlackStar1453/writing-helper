/**
 * 统一缓存管理系统
 * 支持多层缓存：内存缓存 -> Redis缓存 -> 数据源
 */

// import redis from '@/lib/redis'; // 暂时禁用Redis

// 缓存配置接口
export interface CacheConfig {
  /** 缓存键 */
  key: string;
  /** 内存缓存TTL（毫秒） */
  memoryTTL?: number;
  /** Redis缓存TTL（秒） */
  redisTTL?: number;
  /** 是否启用内存缓存 */
  enableMemory?: boolean;
  /** 是否启用Redis缓存 */
  enableRedis?: boolean;
  /** 缓存标签，用于批量失效 */
  tags?: string[];
}

// 缓存项接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

// 缓存统计接口
export interface CacheStats {
  memoryHits: number;
  memoryMisses: number;
  redisHits: number;
  redisMisses: number;
  totalRequests: number;
}

/**
 * 统一缓存管理器
 */
export class CacheManager {
  private memoryCache = new Map<string, CacheItem<any>>();
  private stats: CacheStats = {
    memoryHits: 0,
    memoryMisses: 0,
    redisHits: 0,
    redisMisses: 0,
    totalRequests: 0
  };

  // 默认配置
  private defaultConfig: Required<CacheConfig> = {
    key: '',
    memoryTTL: 5 * 60 * 1000, // 5分钟
    redisTTL: 30 * 60, // 30分钟
    enableMemory: true,
    enableRedis: false, // 暂时禁用Redis
    tags: []
  };

  /**
   * 获取缓存数据
   */
  async get<T>(config: CacheConfig): Promise<T | null> {
    this.stats.totalRequests++;
    const fullConfig = { ...this.defaultConfig, ...config };

    try {
      // 1. 尝试从内存缓存获取
      if (fullConfig.enableMemory) {
        const memoryResult = this.getFromMemory<T>(fullConfig.key);
        if (memoryResult !== null) {
          this.stats.memoryHits++;
          return memoryResult;
        }
        this.stats.memoryMisses++;
      }

      // 2. 尝试从Redis缓存获取 (暂时禁用)
      // if (fullConfig.enableRedis) {
      //   const redisResult = await this.getFromRedis<T>(fullConfig.key);
      //   if (redisResult !== null) {
      //     this.stats.redisHits++;
      //     // 回填内存缓存
      //     if (fullConfig.enableMemory) {
      //       this.setToMemory(fullConfig.key, redisResult, fullConfig.memoryTTL, fullConfig.tags);
      //     }
      //     return redisResult;
      //   }
      //   this.stats.redisMisses++;
      // }

      return null;
    } catch (error) {
      console.error(`[CacheManager] 获取缓存失败 ${fullConfig.key}:`, error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  async set<T>(config: CacheConfig, data: T): Promise<void> {
    const fullConfig = { ...this.defaultConfig, ...config };

    try {
      // 设置内存缓存
      if (fullConfig.enableMemory) {
        this.setToMemory(fullConfig.key, data, fullConfig.memoryTTL, fullConfig.tags);
      }

      // 设置Redis缓存 (暂时禁用)
      // if (fullConfig.enableRedis) {
      //   await this.setToRedis(fullConfig.key, data, fullConfig.redisTTL, fullConfig.tags);
      // }
    } catch (error) {
      console.error(`[CacheManager] 设置缓存失败 ${fullConfig.key}:`, error);
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  async getOrSet<T>(
    config: CacheConfig,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // 先尝试获取缓存
    const cached = await this.get<T>(config);
    if (cached !== null) {
      return cached;
    }

    // 缓存未命中，获取数据
    const data = await fetcher();
    
    // 设置缓存
    await this.set(config, data);
    
    return data;
  }

  /**
   * 删除指定缓存
   */
  async delete(key: string): Promise<void> {
    try {
      // 删除内存缓存
      this.memoryCache.delete(key);
      
      // 删除Redis缓存 (暂时禁用)
      // await redis.del(key);
    } catch (error) {
      console.error(`[CacheManager] 删除缓存失败 ${key}:`, error);
    }
  }

  /**
   * 根据标签批量删除缓存
   */
  async deleteByTags(tags: string[]): Promise<void> {
    try {
      // 删除内存缓存中匹配标签的项
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.tags && item.tags.some(tag => tags.includes(tag))) {
          this.memoryCache.delete(key);
        }
      }

      // Redis中的标签删除需要维护标签到键的映射 (暂时禁用)
      // 这里简化处理，实际项目中可以考虑使用Redis的SET来维护标签映射
      // for (const tag of tags) {
      //   const tagKey = `tag:${tag}`;
      //   const keys = await redis.smembers(tagKey);
      //   if (keys && keys.length > 0) {
      //     await redis.del(...keys);
      //     await redis.del(tagKey);
      //   }
      // }
    } catch (error) {
      console.error('[CacheManager] 根据标签删除缓存失败:', error);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      // 注意：这里不清空整个Redis，只清空应用相关的缓存
      // 实际项目中应该有更精确的清理策略
    } catch (error) {
      console.error('[CacheManager] 清空缓存失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      memoryHits: 0,
      memoryMisses: 0,
      redisHits: 0,
      redisMisses: 0,
      totalRequests: 0
    };
  }

  // 私有方法：从内存缓存获取
  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // 私有方法：设置内存缓存
  private setToMemory<T>(key: string, data: T, ttl: number, tags?: string[]): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      tags
    });
  }

  // 私有方法：从Redis获取 (暂时禁用)
  private async getFromRedis<T>(key: string): Promise<T | null> {
    // try {
    //   const data = await redis.get(key);
    //   return data as T;
    // } catch (error) {
    //   console.error(`[CacheManager] Redis获取失败 ${key}:`, error);
    //   return null;
    // }
    return null; // 暂时直接返回null
  }

  // 私有方法：设置Redis缓存 (暂时禁用)
  private async setToRedis<T>(key: string, data: T, ttl: number, tags?: string[]): Promise<void> {
    // try {
    //   await redis.set(key, data, { ex: ttl });
    //
    //   // 维护标签映射
    //   if (tags && tags.length > 0) {
    //     for (const tag of tags) {
    //       await redis.sadd(`tag:${tag}`, key);
    //       await redis.expire(`tag:${tag}`, ttl);
    //     }
    //   }
    // } catch (error) {
    //   console.error(`[CacheManager] Redis设置失败 ${key}:`, error);
    // }
    // 暂时不执行任何Redis操作
  }

  // 定期清理过期的内存缓存
  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.memoryCache.entries()) {
        if (now - item.timestamp > item.ttl) {
          this.memoryCache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  constructor() {
    this.startCleanupTimer();
  }
}

// 导出单例实例
export const cacheManager = new CacheManager();
