/**
 * 定价数据缓存系统
 * 使用Redis进行长期缓存，优化pricing页面加载性能
 */

import { redisCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { getXorpayProducts } from '@/lib/payments/xorpay';
import { getActivePromotions, findBestAutoPromotionsBatch } from '@/lib/promotions';

// 内存缓存作为Redis的备用方案
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// 内存缓存清理间隔（5分钟）
const MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000;

// 定期清理过期的内存缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (now - item.timestamp > item.ttl) {
      memoryCache.delete(key);
    }
  }
}, MEMORY_CLEANUP_INTERVAL);

export interface CachedPricingData {
  stripePrices: any[];
  stripeProducts: any[];
  xorpayProducts: any[];
  activePromotions: any[];
  preferredPrices: Map<string, any>;
  promotionCalculations: any[];
  timestamp: number;
}

/**
 * 通用缓存获取函数
 */
async function getCachedData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  // 首先尝试从内存缓存获取（更快，更可靠）
  try {
    const memoryItem = memoryCache.get(cacheKey);
    if (memoryItem && Date.now() - memoryItem.timestamp < memoryItem.ttl) {
      console.log(`📦 [Memory] 从内存缓存获取 ${cacheKey}`);
      return memoryItem.data;
    }
  } catch (memoryError) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [Memory] 内存缓存获取失败: ${cacheKey}`, memoryError);
    }
  }

  // 然后尝试从Redis获取
  try {
    const cached = await redisCache.get<{ data: T; timestamp: number }>(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl * 1000) {
      console.log(`📦 [Redis] 从Redis缓存获取 ${cacheKey}`);
      // 同时更新内存缓存
      memoryCache.set(cacheKey, { data: cached.data, timestamp: cached.timestamp, ttl: ttl * 1000 });
      return cached.data;
    }
  } catch (redisError) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [Redis] 获取失败: ${cacheKey}`, redisError);
    }
  }

  // 缓存未命中，获取新数据
  try {
    console.log(`🔄 [Cache] 缓存未命中，获取新数据: ${cacheKey}`);
    const data = await fetcher();

    // 缓存到Redis和内存（不等待完成，避免阻塞）
    setCachedData(cacheKey, data, ttl).catch(error => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ [Cache] 设置缓存失败: ${cacheKey}`, error);
      }
    });

    return data;
  } catch (fetchError) {
    console.error(`❌ [Cache] 获取数据失败: ${cacheKey}`, fetchError);
    throw fetchError;
  }
}

/**
 * 通用缓存设置函数
 */
async function setCachedData<T>(
  cacheKey: string,
  data: T,
  ttl: number
): Promise<void> {
  const cacheItem = { data, timestamp: Date.now() };

  // 优先设置内存缓存（更可靠）
  try {
    memoryCache.set(cacheKey, { data, timestamp: Date.now(), ttl: ttl * 1000 });
    console.log(`💾 [Memory] 缓存数据到内存: ${cacheKey}`);
  } catch (memoryError) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [Memory] 内存缓存设置失败: ${cacheKey}`, memoryError);
    }
  }

  // 异步设置到Redis，不阻塞主流程
  redisCache.set(cacheKey, cacheItem, ttl).then(success => {
    if (success) {
      console.log(`💾 [Redis] 缓存数据到Redis: ${cacheKey}`);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [Redis] 设置失败: ${cacheKey}`);
    }
  }).catch(redisError => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [Redis] 设置失败: ${cacheKey}`, redisError);
    }
  });
}

/**
 * 获取缓存的Stripe价格数据
 */
export async function getCachedStripePrices() {
  return getCachedData(
    CACHE_KEYS.PRICING_STRIPE_PRICES,
    async () => {
      console.log('[PricingCache] 获取Stripe价格数据...');
      return await getStripePrices();
    },
    CACHE_TTL.PRICING_STRIPE_PRICES
  );
}

/**
 * 获取缓存的Stripe产品数据
 */
export async function getCachedStripeProducts() {
  return getCachedData(
    CACHE_KEYS.PRICING_STRIPE_PRODUCTS,
    async () => {
      console.log('[PricingCache] 获取Stripe产品数据...');
      return await getStripeProducts();
    },
    CACHE_TTL.PRICING_STRIPE_PRODUCTS
  );
}

/**
 * 获取缓存的Xorpay产品数据
 */
export async function getCachedXorpayProducts() {
  return getCachedData(
    CACHE_KEYS.PRICING_XORPAY_PRODUCTS,
    async () => {
      console.log('[PricingCache] 获取Xorpay产品数据...');
      return getXorpayProducts();
    },
    CACHE_TTL.PRICING_XORPAY_PRODUCTS
  );
}

/**
 * 获取缓存的活跃促销数据
 */
export async function getCachedActivePromotions() {
  return getCachedData(
    CACHE_KEYS.PRICING_ACTIVE_PROMOTIONS,
    async () => {
      console.log('[PricingCache] 获取活跃促销数据...');
      return await getActivePromotions();
    },
    CACHE_TTL.PRICING_ACTIVE_PROMOTIONS
  );
}

/**
 * 获取缓存的首选价格数据
 */
export async function getCachedPreferredPrices() {
  return getCachedData(
    `${CACHE_KEYS.PRICING_COMPLETE_DATA}:preferred`,
    async () => {
      console.log('[PricingCache] 计算首选价格...');

      // 并行获取价格和产品数据
      const [prices, products] = await Promise.all([
        getCachedStripePrices(),
        getCachedStripeProducts()
      ]);

      const preferredPrices = new Map();

      for (const product of products) {
        const productPrices = prices.filter(p => p.productId === product.id);
        if (productPrices.length === 0) continue;

        let preferredPrice;
        if (product.name === 'Premium') {
          preferredPrice = productPrices.find(p => p.unitAmount === 499 && p.interval === 'month')
            || productPrices[0];
        } else if (product.name === 'Lifetime') {
          preferredPrice = productPrices.find(p => p.unitAmount === 4900 && !p.interval)
            || productPrices[0];
        } else {
          preferredPrice = productPrices[0];
        }

        preferredPrices.set(product.id, preferredPrice);
      }

      return { prices, products, preferredPrices };
    },
    CACHE_TTL.PRICING_COMPLETE_DATA
  );
}

/**
 * 获取缓存的促销计算结果
 */
export async function getCachedPromotionCalculations(requests: Array<{
  planName: string;
  paymentMethod: string;
  originalPrice: number;
}>) {
  // 生成基于请求参数的缓存键
  const requestHash = Buffer.from(JSON.stringify(requests)).toString('base64').slice(0, 16);
  const cacheKey = `${CACHE_KEYS.PRICING_ACTIVE_PROMOTIONS}:calc:${requestHash}`;

  return getCachedData(
    cacheKey,
    async () => {
      console.log('[PricingCache] 计算促销价格...');
      return await findBestAutoPromotionsBatch(requests);
    },
    CACHE_TTL.PRICING_ACTIVE_PROMOTIONS
  );
}

/**
 * 获取完整的定价数据（一次性获取所有数据）
 */
export async function getCompletePricingData(locale: string = 'zh') {
  const cacheKey = `${CACHE_KEYS.PRICING_COMPLETE_DATA}:${locale}`;

  return getCachedData(
    cacheKey,
    async () => {
      console.log('[PricingCache] 获取完整定价数据...');

      // 并行获取所有基础数据
      const [priceData, xorpayProducts, activePromotions] = await Promise.all([
        getCachedPreferredPrices(),
        getCachedXorpayProducts(),
        getCachedActivePromotions()
      ]);

      const { products, preferredPrices } = priceData;

      // 提取产品信息
      const premiumPlan = products.find((product) => product.name === 'Premium');
      const lifeTimePlan = products.find((product) => product.name === 'Lifetime');
      const premiumPrice = premiumPlan ? preferredPrices.get(premiumPlan.id) : null;
      const lifeTimePrice = lifeTimePlan ? preferredPrices.get(lifeTimePlan.id) : null;

      // Xorpay产品
      const xorpayPremium = xorpayProducts.find(p => p.name === 'Premium');
      const xorpayLifetime = xorpayProducts.find(p => p.name === 'Lifetime');

      // 准备促销计算请求
      const promotionRequests = [
        { planName: 'Premium', paymentMethod: 'stripe', originalPrice: premiumPrice?.unitAmount || 499 },
        { planName: 'Premium', paymentMethod: 'xorpay', originalPrice: (xorpayPremium?.priceInYuan || 4.99) * 100 },
        { planName: 'Lifetime', paymentMethod: 'stripe', originalPrice: lifeTimePrice?.unitAmount || 4900 },
        { planName: 'Lifetime', paymentMethod: 'xorpay', originalPrice: (xorpayLifetime?.priceInYuan || 49) * 100 }
      ];

      // 获取促销计算结果
      const promotionCalculations = await getCachedPromotionCalculations(promotionRequests);

      return {
        priceData,
        xorpayProducts,
        activePromotions,
        promotionCalculations,
        premiumPrice,
        lifeTimePrice,
        xorpayPremium,
        xorpayLifetime,
        timestamp: Date.now()
      };
    },
    CACHE_TTL.PRICING_COMPLETE_DATA
  );
}

/**
 * 预热定价缓存
 */
export async function warmupPricingCache() {
  console.log('[PricingCache] 开始预热定价缓存...');

  try {
    // 并行预热所有缓存
    await Promise.all([
      getCachedStripePrices(),
      getCachedStripeProducts(),
      getCachedXorpayProducts(),
      getCachedActivePromotions()
    ]);

    // 预热完整数据
    await getCompletePricingData();

    console.log('[PricingCache] 定价缓存预热完成');
  } catch (error) {
    console.error('[PricingCache] 定价缓存预热失败:', error);
  }
}

/**
 * 清除定价相关缓存
 */
export async function clearPricingCache() {
  console.log('[PricingCache] 清除定价缓存...');

  try {
    // 清除Redis中的定价缓存
    const pricingKeys = [
      CACHE_KEYS.PRICING_STRIPE_PRICES,
      CACHE_KEYS.PRICING_STRIPE_PRODUCTS,
      CACHE_KEYS.PRICING_XORPAY_PRODUCTS,
      CACHE_KEYS.PRICING_ACTIVE_PROMOTIONS,
      CACHE_KEYS.PRICING_COMPLETE_DATA
    ];

    for (const key of pricingKeys) {
      await redisCache.del(key);
      // 注意：Upstash Redis不支持模式匹配删除，需要手动删除相关子键
      // 这里我们只删除已知的子键
      await redisCache.del(`${key}:preferred`);
      await redisCache.del(`${key}:calc`);
    }

    // 清除内存缓存
    for (const [key] of memoryCache.entries()) {
      if (key.includes('pricing:')) {
        memoryCache.delete(key);
      }
    }

    console.log('[PricingCache] 定价缓存已清除');
  } catch (error) {
    console.error('[PricingCache] 清除定价缓存失败:', error);
  }
}

/**
 * 获取缓存统计信息
 */
export async function getPricingCacheStats() {
  try {
    const stats = {
      redis: {
        stripePrices: await redisCache.exists(CACHE_KEYS.PRICING_STRIPE_PRICES),
        stripeProducts: await redisCache.exists(CACHE_KEYS.PRICING_STRIPE_PRODUCTS),
        xorpayProducts: await redisCache.exists(CACHE_KEYS.PRICING_XORPAY_PRODUCTS),
        activePromotions: await redisCache.exists(CACHE_KEYS.PRICING_ACTIVE_PROMOTIONS),
        completeData: await redisCache.exists(CACHE_KEYS.PRICING_COMPLETE_DATA)
      },
      memory: {
        total: memoryCache.size,
        pricingKeys: Array.from(memoryCache.keys()).filter(key => key.includes('pricing:')).length
      },
      lastUpdated: new Date().toISOString()
    };

    return stats;
  } catch (error) {
    console.error('[PricingCache] 获取缓存统计失败:', error);
    return {
      redis: {},
      memory: { total: 0, pricingKeys: 0 },
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
