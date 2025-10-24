/**
 * 小说创作工具 - 平台检测和存储适配器
 */

import { StorageAdapter } from './types';
import { IndexedDBStorage } from './storage/indexeddb-storage';

/**
 * 检测是否在 Tauri 环境中运行
 */
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return '__TAURI__' in window;
}

/**
 * 获取适合当前环境的存储适配器
 * 使用动态导入避免在 Web 环境下加载 Tauri 模块
 */
export async function getStorageAdapter(): Promise<StorageAdapter> {
  if (isTauriEnvironment()) {
    // 动态导入 Tauri 存储,避免在 Web 环境下加载
    const { TauriFileStorage } = await import('./storage/tauri-file-storage');
    return new TauriFileStorage();
  } else {
    return new IndexedDBStorage();
  }
}

/**
 * 生成 UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

