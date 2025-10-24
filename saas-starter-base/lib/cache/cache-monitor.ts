/**
 * 缓存监控和管理工具
 * 提供缓存状态监控、性能分析和管理功能
 */

import { cacheManager } from './cache-manager';
import { CACHE_TAGS } from './cache-keys';

// 缓存监控数据接口
export interface CacheMonitorData {
  stats: {
    memoryHits: number;
    memoryMisses: number;
    redisHits: number;
    redisMisses: number;
    totalRequests: number;
    hitRate: number;
    memoryHitRate: number;
    redisHitRate: number;
  };
  performance: {
    averageResponseTime: number;
    slowQueries: Array<{
      key: string;
      duration: number;
      timestamp: number;
    }>;
  };
  memory: {
    usage: number;
    itemCount: number;
    topKeys: Array<{
      key: string;
      size: number;
      accessCount: number;
      lastAccess: number;
    }>;
  };
}

// 性能监控类
class CachePerformanceMonitor {
  private queryTimes = new Map<string, number[]>();
  private slowQueryThreshold = 1000; // 1秒
  private slowQueries: Array<{ key: string; duration: number; timestamp: number }> = [];
  private maxSlowQueries = 100;

  /**
   * 记录查询开始时间
   */
  startQuery(key: string): string {
    const queryId = `${key}-${Date.now()}-${Math.random()}`;
    const times = this.queryTimes.get(key) || [];
    times.push(Date.now());
    this.queryTimes.set(key, times);
    return queryId;
  }

  /**
   * 记录查询结束时间
   */
  endQuery(key: string, queryId: string): void {
    const times = this.queryTimes.get(key);
    if (!times || times.length === 0) return;

    const startTime = times.pop()!;
    const duration = Date.now() - startTime;

    // 记录慢查询
    if (duration > this.slowQueryThreshold) {
      this.slowQueries.push({
        key,
        duration,
        timestamp: Date.now()
      });

      // 保持慢查询记录数量在限制内
      if (this.slowQueries.length > this.maxSlowQueries) {
        this.slowQueries = this.slowQueries.slice(-this.maxSlowQueries);
      }
    }
  }

  /**
   * 获取平均响应时间
   */
  getAverageResponseTime(): number {
    const allTimes: number[] = [];
    for (const times of this.queryTimes.values()) {
      allTimes.push(...times);
    }

    if (allTimes.length === 0) return 0;

    const now = Date.now();
    const recentTimes = allTimes.filter(time => now - time < 300000); // 最近5分钟
    
    if (recentTimes.length === 0) return 0;

    return recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(): Array<{ key: string; duration: number; timestamp: number }> {
    return [...this.slowQueries];
  }

  /**
   * 清除性能数据
   */
  clear(): void {
    this.queryTimes.clear();
    this.slowQueries = [];
  }
}

/**
 * 缓存监控器
 */
export class CacheMonitor {
  private performanceMonitor = new CachePerformanceMonitor();
  private memoryUsageTracker = new Map<string, { size: number; accessCount: number; lastAccess: number }>();

  /**
   * 获取缓存监控数据
   */
  async getMonitorData(): Promise<CacheMonitorData> {
    const stats = cacheManager.getStats();
    const totalHits = stats.memoryHits + stats.redisHits;
    const totalMisses = stats.memoryMisses + stats.redisMisses;
    const totalRequests = totalHits + totalMisses;

    return {
      stats: {
        ...stats,
        hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
        memoryHitRate: (stats.memoryHits + stats.memoryMisses) > 0 
          ? (stats.memoryHits / (stats.memoryHits + stats.memoryMisses)) * 100 
          : 0,
        redisHitRate: (stats.redisHits + stats.redisMisses) > 0 
          ? (stats.redisHits / (stats.redisHits + stats.redisMisses)) * 100 
          : 0
      },
      performance: {
        averageResponseTime: this.performanceMonitor.getAverageResponseTime(),
        slowQueries: this.performanceMonitor.getSlowQueries()
      },
      memory: {
        usage: this.getMemoryUsage(),
        itemCount: this.memoryUsageTracker.size,
        topKeys: this.getTopKeys()
      }
    };
  }

  /**
   * 记录内存使用情况
   */
  trackMemoryUsage(key: string, size: number): void {
    const existing = this.memoryUsageTracker.get(key);
    this.memoryUsageTracker.set(key, {
      size,
      accessCount: existing ? existing.accessCount + 1 : 1,
      lastAccess: Date.now()
    });
  }

  /**
   * 获取内存使用量（估算）
   */
  private getMemoryUsage(): number {
    let totalSize = 0;
    for (const item of this.memoryUsageTracker.values()) {
      totalSize += item.size;
    }
    return totalSize;
  }

  /**
   * 获取访问最频繁的缓存键
   */
  private getTopKeys(): Array<{ key: string; size: number; accessCount: number; lastAccess: number }> {
    return Array.from(this.memoryUsageTracker.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
  }

  /**
   * 清理过期的监控数据
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const [key, data] of this.memoryUsageTracker.entries()) {
      if (now - data.lastAccess > maxAge) {
        this.memoryUsageTracker.delete(key);
      }
    }

    this.performanceMonitor.clear();
  }

  /**
   * 重置统计数据
   */
  reset(): void {
    cacheManager.resetStats();
    this.performanceMonitor.clear();
    this.memoryUsageTracker.clear();
  }
}

/**
 * 缓存管理工具
 */
export class CacheAdmin {
  /**
   * 清除指定标签的缓存
   */
  async clearByTag(tag: string): Promise<void> {
    await cacheManager.deleteByTags([tag]);
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    await cacheManager.clear();
  }

  /**
   * 预热缓存
   */
  async warmupCache(keys: string[]): Promise<void> {
    // 这里可以实现缓存预热逻辑
    console.log('开始预热缓存:', keys);
    
    // 示例：预热功能列表缓存
    if (keys.includes('features')) {
      try {
        await fetch('/api/features?locale=zh');
        await fetch('/api/features?locale=en');
        console.log('功能列表缓存预热完成');
      } catch (error) {
        console.error('功能列表缓存预热失败:', error);
      }
    }

    // 示例：预热定价数据缓存
    if (keys.includes('pricing')) {
      try {
        await Promise.all([
          fetch('/api/pricing/stripe/prices'),
          fetch('/api/pricing/stripe/products'),
          fetch('/api/promotions/active')
        ]);
        console.log('定价数据缓存预热完成');
      } catch (error) {
        console.error('定价数据缓存预热失败:', error);
      }
    }
  }

  /**
   * 获取缓存健康状态
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const monitor = new CacheMonitor();
    const data = await monitor.getMonitorData();
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 检查命中率
    if (data.stats.hitRate < 50) {
      issues.push(`缓存命中率过低: ${data.stats.hitRate.toFixed(1)}%`);
      recommendations.push('考虑增加缓存TTL或优化缓存策略');
      status = 'warning';
    }

    // 检查慢查询
    if (data.performance.slowQueries.length > 10) {
      issues.push(`慢查询过多: ${data.performance.slowQueries.length}个`);
      recommendations.push('检查慢查询并优化相关接口');
      if (status === 'healthy') status = 'warning';
    }

    // 检查内存使用
    if (data.memory.usage > 100 * 1024 * 1024) { // 100MB
      issues.push(`内存使用过高: ${(data.memory.usage / 1024 / 1024).toFixed(1)}MB`);
      recommendations.push('考虑减少缓存TTL或清理不必要的缓存');
      status = 'critical';
    }

    return { status, issues, recommendations };
  }
}

// 导出单例实例
export const cacheMonitor = new CacheMonitor();
export const cacheAdmin = new CacheAdmin();
