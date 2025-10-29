/**
 * Storage Adapter 导出
 */

import { StorageAdapter } from '../types';
import { IndexedDBStorage } from './indexeddb-storage';

// 单例实例
let storageInstance: StorageAdapter | null = null;

/**
 * 获取存储适配器
 * 根据环境返回对应的存储实现
 */
export function getStorageAdapter(): StorageAdapter {
  // 返回单例实例
  if (storageInstance) {
    return storageInstance;
  }

  // 检查是否在Tauri环境中
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    // TODO: 实现Tauri存储适配器
    throw new Error('Tauri storage not implemented yet');
  }

  // 默认使用IndexedDB
  storageInstance = new IndexedDBStorage();
  return storageInstance;
}

