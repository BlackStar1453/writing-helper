/**
 * 版本信息缓存管理系统
 * 用于缓存GitHub releases版本检测结果，减少重复请求
 */

import { CacheManager, CacheConfig } from './cache-manager';
import { CACHE_TAGS } from './cache-keys';

// 版本检测结果接口
export interface VersionCheckResult {
  exists: boolean;
  url: string | null;
  size: number | null;
  platform: string;
  version: string;
  message?: string;
  error?: string;
}

// 批量版本检测结果接口
export interface BatchVersionCheckResult {
  version: string;
  availability: {
    windows: boolean;
    macIntel: boolean;
    macAppleSilicon: boolean;
  };
  details: any[]; // 使用any[]以兼容不同的返回格式
  lastUpdated: string;
}

// 版本缓存管理器
export class VersionCacheManager {
  private cacheManager: CacheManager;
  
  // 缓存配置
  private readonly VERSION_CHECK_CONFIG: CacheConfig = {
    key: '',
    memoryTTL: 24 * 60 * 60 * 1000, // 24小时内存缓存
    redisTTL: 7 * 24 * 60 * 60, // 7天Redis缓存
    enableMemory: true,
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.RELEASE_DATA, CACHE_TAGS.VERSION_DATA]
  };

  constructor() {
    this.cacheManager = new CacheManager();
  }

  /**
   * 获取单个版本平台检测结果
   */
  async getVersionCheck(version: string, platform: string): Promise<VersionCheckResult | null> {
    const cacheKey = `version-check:${version}:${platform}`;
    const config = { ...this.VERSION_CHECK_CONFIG, key: cacheKey };
    
    return await this.cacheManager.get<VersionCheckResult>(config);
  }

  /**
   * 设置单个版本平台检测结果
   */
  async setVersionCheck(version: string, platform: string, result: VersionCheckResult): Promise<void> {
    const cacheKey = `version-check:${version}:${platform}`;
    const config = { ...this.VERSION_CHECK_CONFIG, key: cacheKey };
    
    await this.cacheManager.set(config, result);
  }

  /**
   * 获取批量版本检测结果
   */
  async getBatchVersionCheck(version: string): Promise<BatchVersionCheckResult | null> {
    const cacheKey = `batch-version-check:${version}`;
    const config = { ...this.VERSION_CHECK_CONFIG, key: cacheKey };
    
    return await this.cacheManager.get<BatchVersionCheckResult>(config);
  }

  /**
   * 设置批量版本检测结果
   */
  async setBatchVersionCheck(version: string, result: BatchVersionCheckResult): Promise<void> {
    const cacheKey = `batch-version-check:${version}`;
    const config = { ...this.VERSION_CHECK_CONFIG, key: cacheKey };
    
    await this.cacheManager.set(config, result);
  }

  /**
   * 获取latest.json缓存
   */
  async getLatestJson(version: string): Promise<any | null> {
    const cacheKey = `latest-json:${version}`;
    const config = { ...this.VERSION_CHECK_CONFIG, key: cacheKey };
    
    return await this.cacheManager.get(config);
  }

  /**
   * 设置latest.json缓存
   */
  async setLatestJson(version: string, data: any): Promise<void> {
    const cacheKey = `latest-json:${version}`;
    const config = { ...this.VERSION_CHECK_CONFIG, key: cacheKey };
    
    await this.cacheManager.set(config, data);
  }

  /**
   * 清除指定版本的所有缓存
   */
  async clearVersionCache(version: string): Promise<void> {
    const platforms = ['windows', 'mac-intel', 'mac-silicon'];

    // 清除单个平台缓存
    for (const platform of platforms) {
      const cacheKey = `version-check:${version}:${platform}`;
      await this.cacheManager.delete(cacheKey);
    }

    // 清除批量检测缓存
    const batchCacheKey = `batch-version-check:${version}`;
    await this.cacheManager.delete(batchCacheKey);

    // 清除latest.json缓存
    const latestCacheKey = `latest-json:${version}`;
    await this.cacheManager.delete(latestCacheKey);
  }

  /**
   * 清除所有版本缓存
   */
  async clearAllVersionCache(): Promise<void> {
    await this.cacheManager.deleteByTags([CACHE_TAGS.VERSION_DATA]);
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<any> {
    return this.cacheManager.getStats();
  }
}

// 导出单例实例
export const versionCache = new VersionCacheManager();
