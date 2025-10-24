/**
 * 缓存键命名规范和预定义配置
 * 统一管理所有缓存键，避免键名冲突
 */

import { CacheConfig } from './cache-manager';

/**
 * 缓存键命名空间
 */
export const CACHE_NAMESPACES = {
  USER: 'user',
  FEATURES: 'features',
  PRICING: 'pricing',
  RELEASES: 'releases',
  NETWORK: 'network',
  ACTIONS: 'actions',
  TRANSLATIONS: 'translations',
  PROMOTIONS: 'promotions'
} as const;

/**
 * 缓存标签定义
 */
export const CACHE_TAGS = {
  USER_DATA: 'user-data',
  PRICING_DATA: 'pricing-data',
  FEATURE_DATA: 'feature-data',
  RELEASE_DATA: 'release-data',
  VERSION_DATA: 'version-data',
  TRANSLATION_DATA: 'translation-data',
  PROMOTION_DATA: 'promotion-data',
  NETWORK_DATA: 'network-data',
  ACTIONS_DATA: 'actions-data'
} as const;

/**
 * 生成缓存键的工具函数
 */
export class CacheKeyBuilder {
  /**
   * 构建用户相关缓存键
   */
  static user(subKey: string, userId?: string): string {
    const base = `${CACHE_NAMESPACES.USER}:${subKey}`;
    return userId ? `${base}:${userId}` : base;
  }

  /**
   * 构建功能相关缓存键
   */
  static features(subKey: string, locale?: string): string {
    const base = `${CACHE_NAMESPACES.FEATURES}:${subKey}`;
    return locale ? `${base}:${locale}` : base;
  }

  /**
   * 构建定价相关缓存键
   */
  static pricing(subKey: string, region?: string): string {
    const base = `${CACHE_NAMESPACES.PRICING}:${subKey}`;
    return region ? `${base}:${region}` : base;
  }

  /**
   * 构建版本发布相关缓存键
   */
  static releases(subKey: string): string {
    return `${CACHE_NAMESPACES.RELEASES}:${subKey}`;
  }

  /**
   * 构建网络检测相关缓存键
   */
  static network(subKey: string): string {
    return `${CACHE_NAMESPACES.NETWORK}:${subKey}`;
  }

  /**
   * 构建Actions相关缓存键
   */
  static actions(subKey: string, locale?: string): string {
    const base = `${CACHE_NAMESPACES.ACTIONS}:${subKey}`;
    return locale ? `${base}:${locale}` : base;
  }

  /**
   * 构建翻译相关缓存键
   */
  static translations(subKey: string, locale: string): string {
    return `${CACHE_NAMESPACES.TRANSLATIONS}:${subKey}:${locale}`;
  }

  /**
   * 构建促销相关缓存键
   */
  static promotions(subKey: string): string {
    return `${CACHE_NAMESPACES.PROMOTIONS}:${subKey}`;
  }
}

/**
 * 预定义的缓存配置
 */
export const CACHE_CONFIGS = {
  // 用户相关缓存
  USER_AUTH: {
    memoryTTL: 15 * 60 * 1000, // 15分钟
    redisTTL: 60 * 60, // 1小时
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.USER_DATA]
  } as Partial<CacheConfig>,

  USER_PROFILE: {
    memoryTTL: 10 * 60 * 1000, // 10分钟
    redisTTL: 30 * 60, // 30分钟
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.USER_DATA]
  } as Partial<CacheConfig>,

  // 功能相关缓存
  FEATURES_LIST: {
    memoryTTL: 5 * 60 * 1000, // 5分钟
    redisTTL: 15 * 60, // 15分钟
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.FEATURE_DATA]
  } as Partial<CacheConfig>,

  FEATURE_VOTES: {
    memoryTTL: 2 * 60 * 1000, // 2分钟
    redisTTL: 10 * 60, // 10分钟
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.FEATURE_DATA]
  } as Partial<CacheConfig>,

  // 定价相关缓存
  STRIPE_PRICES: {
    memoryTTL: 10 * 60 * 1000, // 10分钟
    redisTTL: 30 * 60, // 30分钟
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.PRICING_DATA]
  } as Partial<CacheConfig>,

  STRIPE_PRODUCTS: {
    memoryTTL: 15 * 60 * 1000, // 15分钟
    redisTTL: 60 * 60, // 1小时
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.PRICING_DATA]
  } as Partial<CacheConfig>,

  XORPAY_PRODUCTS: {
    memoryTTL: 30 * 60 * 1000, // 30分钟
    redisTTL: 2 * 60 * 60, // 2小时
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.PRICING_DATA]
  } as Partial<CacheConfig>,

  PROMOTIONS_ACTIVE: {
    memoryTTL: 5 * 60 * 1000, // 5分钟
    redisTTL: 15 * 60, // 15分钟
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.PROMOTION_DATA]
  } as Partial<CacheConfig>,

  // 版本发布相关缓存
  GITHUB_RELEASES: {
    memoryTTL: 5 * 60 * 1000, // 5分钟
    redisTTL: 10 * 60, // 10分钟
    tags: [CACHE_TAGS.RELEASE_DATA]
  } as Partial<CacheConfig>,

  LATEST_DOWNLOAD: {
    memoryTTL: 3 * 60 * 1000, // 3分钟
    redisTTL: 5 * 60, // 5分钟
    tags: [CACHE_TAGS.RELEASE_DATA]
  } as Partial<CacheConfig>,

  // 版本检测缓存
  VERSION_CHECK: {
    memoryTTL: 24 * 60 * 60 * 1000, // 24小时
    redisTTL: 7 * 24 * 60 * 60, // 7天
    enableRedis: false, // 暂时禁用Redis
    tags: [CACHE_TAGS.VERSION_DATA, CACHE_TAGS.RELEASE_DATA]
  } as Partial<CacheConfig>,

  // 网络检测缓存
  NETWORK_ACCESS: {
    memoryTTL: 2 * 60 * 1000, // 2分钟
    redisTTL: 5 * 60, // 5分钟
    tags: [CACHE_TAGS.NETWORK_DATA]
  } as Partial<CacheConfig>,

  // Actions相关缓存
  BUILTIN_ACTIONS: {
    memoryTTL: 30 * 60 * 1000, // 30分钟
    redisTTL: 2 * 60 * 60, // 2小时
    tags: [CACHE_TAGS.ACTIONS_DATA]
  } as Partial<CacheConfig>,

  CUSTOM_ACTIONS: {
    memoryTTL: 10 * 60 * 1000, // 10分钟
    redisTTL: 30 * 60, // 30分钟
    tags: [CACHE_TAGS.ACTIONS_DATA]
  } as Partial<CacheConfig>,

  // 翻译相关缓存
  FEATURE_TRANSLATIONS: {
    memoryTTL: 15 * 60 * 1000, // 15分钟
    redisTTL: 60 * 60, // 1小时
    tags: [CACHE_TAGS.TRANSLATION_DATA]
  } as Partial<CacheConfig>,

  // 短期缓存（用于防止重复请求）
  SHORT_TERM: {
    memoryTTL: 30 * 1000, // 30秒
    redisTTL: 2 * 60, // 2分钟
    enableRedis: false // 只使用内存缓存
  } as Partial<CacheConfig>,

  // 长期缓存（用于相对稳定的数据）
  LONG_TERM: {
    memoryTTL: 60 * 60 * 1000, // 1小时
    redisTTL: 24 * 60 * 60, // 24小时
    tags: []
  } as Partial<CacheConfig>
} as const;

/**
 * 缓存失效策略
 */
export const CACHE_INVALIDATION = {
  /**
   * 用户数据更新时需要失效的缓存标签
   */
  ON_USER_UPDATE: [CACHE_TAGS.USER_DATA],

  /**
   * 功能数据更新时需要失效的缓存标签
   */
  ON_FEATURE_UPDATE: [CACHE_TAGS.FEATURE_DATA],

  /**
   * 定价数据更新时需要失效的缓存标签
   */
  ON_PRICING_UPDATE: [CACHE_TAGS.PRICING_DATA, CACHE_TAGS.PROMOTION_DATA],

  /**
   * 版本发布时需要失效的缓存标签
   */
  ON_RELEASE_UPDATE: [CACHE_TAGS.RELEASE_DATA],

  /**
   * 翻译更新时需要失效的缓存标签
   */
  ON_TRANSLATION_UPDATE: [CACHE_TAGS.TRANSLATION_DATA],

  /**
   * Actions更新时需要失效的缓存标签
   */
  ON_ACTIONS_UPDATE: [CACHE_TAGS.ACTIONS_DATA]
} as const;

/**
 * 缓存预热配置
 */
export const CACHE_WARMUP = {
  /**
   * 应用启动时需要预热的缓存
   */
  ON_STARTUP: [
    'features:list:zh',
    'features:list:en',
    'pricing:stripe-products',
    'releases:latest'
  ],

  /**
   * 用户登录时需要预热的缓存
   */
  ON_USER_LOGIN: (userId: string) => [
    CacheKeyBuilder.user('profile', userId),
    CacheKeyBuilder.user('preferences', userId)
  ]
} as const;
