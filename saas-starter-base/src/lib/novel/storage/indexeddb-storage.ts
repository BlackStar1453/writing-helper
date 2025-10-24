/**
 * IndexedDB 存储实现
 */

import { StorageAdapter } from '../types';
import { generateUUID } from '../platform-utils';

export class IndexedDBStorage implements StorageAdapter {
  private dbName = 'NovelWritingDB';
  private version = 3; // 升级版本以添加prompts集合
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

      request.onupgradeneeded = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const oldVersion = event.oldVersion;

        // 创建 Object Stores
        if (!db.objectStoreNames.contains('characters')) {
          const charactersStore = db.createObjectStore('characters', { keyPath: 'id' });
          charactersStore.createIndex('novelId', 'novelId', { unique: false });
        }
        if (!db.objectStoreNames.contains('locations')) {
          const locationsStore = db.createObjectStore('locations', { keyPath: 'id' });
          locationsStore.createIndex('novelId', 'novelId', { unique: false });
        }
        if (!db.objectStoreNames.contains('worldTimeline')) {
          const worldTimelineStore = db.createObjectStore('worldTimeline', { keyPath: 'id' });
          worldTimelineStore.createIndex('novelId', 'novelId', { unique: false });
        }
        if (!db.objectStoreNames.contains('chapters')) {
          const chaptersStore = db.createObjectStore('chapters', { keyPath: 'id' });
          chaptersStore.createIndex('novelId', 'novelId', { unique: false });
        }
        if (!db.objectStoreNames.contains('novelSettings')) {
          db.createObjectStore('novelSettings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('novels')) {
          db.createObjectStore('novels', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('prompts')) {
          const promptsStore = db.createObjectStore('prompts', { keyPath: 'id' });
          promptsStore.createIndex('novelId', 'novelId', { unique: false });
        }

        // 数据迁移: 从版本1升级到版本2
        if (oldVersion < 2) {
          // 创建默认小说项目 "The Game"
          const defaultNovelId = generateUUID();
          const defaultNovel = {
            id: defaultNovelId,
            title: 'The Game',
            description: '',
            globalPrompt: '',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const novelsStore = transaction.objectStore('novels');
          novelsStore.add(defaultNovel);

          // 为所有现有数据添加novelId
          const collections = ['characters', 'locations', 'worldTimeline', 'chapters'];
          for (const collection of collections) {
            if (db.objectStoreNames.contains(collection)) {
              const store = transaction.objectStore(collection);
              const getAllRequest = store.getAll();

              getAllRequest.onsuccess = () => {
                const items = getAllRequest.result;
                items.forEach((item: any) => {
                  if (!item.novelId) {
                    item.novelId = defaultNovelId;
                    store.put(item);
                  }
                });
              };
            }
          }

          // 保存默认小说ID到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentNovelId', defaultNovelId);
          }
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

  /**
   * 按novelId过滤列表数据
   */
  async listByNovelId(collection: string, novelId: string): Promise<any[]> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([collection], 'readonly');
      const store = transaction.objectStore(collection);

      // 如果有novelId索引,使用索引查询
      if (store.indexNames.contains('novelId')) {
        const index = store.index('novelId');
        const request = index.getAll(novelId);

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(new Error(`Failed to list data from ${collection} by novelId`));
        };
      } else {
        // 如果没有索引,使用getAll然后过滤
        const request = store.getAll();

        request.onsuccess = () => {
          const results = (request.result || []).filter((item: any) => item.novelId === novelId);
          resolve(results);
        };

        request.onerror = () => {
          reject(new Error(`Failed to list data from ${collection}`));
        };
      }
    });
  }
}

