/**
 * 定价缓存初始化模块
 * 提供简单的缓存预热功能
 */

import { warmupPricingCache } from './pricing-cache';

/**
 * 简单的缓存预热函数
 * 在后台执行，不阻塞主流程
 */
export async function initializePricingCache(): Promise<void> {
  try {
    console.log('[PricingCacheInit] 开始后台预热定价缓存...');

    // 在后台预热缓存，不等待完成
    warmupPricingCache().catch(error => {
      console.error('[PricingCacheInit] 预热定价缓存失败:', error);
    });

    console.log('[PricingCacheInit] 定价缓存预热已启动');
  } catch (error) {
    console.error('[PricingCacheInit] 定价缓存初始化失败:', error);
    // 不抛出错误，避免影响主流程
  }
}
