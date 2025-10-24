/**
 * 服务器初始化脚本
 * 在服务器启动时自动执行全局预热
 */

import { globalServerWarmup } from './warmup';

/**
 * 服务器启动时的初始化函数
 * 应该在应用程序启动时调用一次
 */
export async function initializeServer(): Promise<void> {
  // 检查是否已经初始化完成
  if (globalServerWarmup.isReady()) {
    console.log('✅ 服务器已经初始化完成，跳过重复初始化');
    return;
  }

  console.log('🚀 开始服务器初始化...');

  try {
    // 执行全局预热
    await globalServerWarmup.warmup();

    console.log('✅ 服务器初始化完成');
  } catch (error) {
    console.error('❌ 服务器初始化失败:', error);
    // 不抛出错误，允许服务器继续启动
  }
}

/**
 * 获取服务器初始化状态
 */
export function getServerInitStatus() {
  return {
    isReady: globalServerWarmup.isReady(),
    warmupInfo: globalServerWarmup.getWarmupInfo()
  };
}

// 注意：自动初始化已移至 instrumentation.ts
// 这里只保留函数定义，由 Next.js Instrumentation API 调用
