/**
 * IndexedDB 存储实现
 */

import { StorageAdapter } from '../types';
import { generateUUID } from '../platform-utils';

export class IndexedDBStorage implements StorageAdapter {
  private dbName = 'NovelWritingDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库
   */
  private async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建 Object Stores
        if (!db.objectStoreNames.contains('characters')) {
          db.createObjectStore('characters', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('locations')) {
          db.createObjectStore('locations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('worldTimeline')) {
          db.createObjectStore('worldTimeline', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chapters')) {
          db.createObjectStore('chapters', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('novelSettings')) {
          db.createObjectStore('novelSettings', { keyPath: 'key' });
        }
      };
    });
  }

  async create(collection: string, data: any): Promise<string> {
    const db = await this.init();
    
    // 添加元数据
    data.id = generateUUID();
    data.createdAt = new Date();
    data.updatedAt = new Date();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      const request = store.add(data);

      request.onsuccess = () => {
        resolve(data.id);
      };

      request.onerror = () => {
        reject(new Error(`Failed to create data in ${collection}`));
      };
    });
  }

  async read(collection: string, id: string): Promise<any> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([collection], 'readonly');
      const store = transaction.objectStore(collection);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to read data from ${collection}`));
      };
    });
  }

  async update(collection: string, id: string, data: any): Promise<void> {
    const db = await this.init();

    return new Promise(async (resolve, reject) => {
      try {
        // 先读取现有数据
        const transaction = db.transaction([collection], 'readonly');
        const store = transaction.objectStore(collection);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const existingData = getRequest.result;

          if (!existingData) {
            reject(new Error(`Data with id ${id} not found in ${collection}`));
            return;
          }

          // 合并数据并更新时间戳
          const updatedData = {
            ...existingData,
            ...data,
            id: id, // 确保id字段存在
            updatedAt: new Date(),
          };

          // 执行更新
          const updateTransaction = db.transaction([collection], 'readwrite');
          const updateStore = updateTransaction.objectStore(collection);
          const putRequest = updateStore.put(updatedData);

          putRequest.onsuccess = () => {
            resolve();
          };

          putRequest.onerror = () => {
            reject(new Error(`Failed to update data in ${collection}`));
          };
        };

        getRequest.onerror = () => {
          reject(new Error(`Failed to read existing data from ${collection}`));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  async delete(collection: string, id: string): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete data from ${collection}`));
      };
    });
  }

  async list(collection: string): Promise<any[]> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([collection], 'readonly');
      const store = transaction.objectStore(collection);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error(`Failed to list data from ${collection}`));
      };
    });
  }
}

