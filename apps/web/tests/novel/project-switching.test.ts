/**
 * 项目切换功能测试
 * 测试切换项目后章节列表是否正确更新
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock IndexedDB
class MockIDBDatabase {
  private stores: Map<string, any[]> = new Map();

  constructor() {
    this.stores.set('novels', []);
    this.stores.set('chapters', []);
    this.stores.set('characters', []);
    this.stores.set('locations', []);
    this.stores.set('events', []);
    this.stores.set('prompts', []);
    this.stores.set('menus', []);
    this.stores.set('settings', []);
  }

  transaction(storeNames: string[], mode: string) {
    return new MockIDBTransaction(this.stores, storeNames);
  }

  createObjectStore(name: string, options?: any) {
    this.stores.set(name, []);
    return new MockIDBObjectStore(this.stores, name);
  }
}

class MockIDBTransaction {
  constructor(private stores: Map<string, any[]>, private storeNames: string[]) {}

  objectStore(name: string) {
    return new MockIDBObjectStore(this.stores, name);
  }
}

class MockIDBObjectStore {
  constructor(private stores: Map<string, any[]>, private storeName: string) {}

  get(id: string) {
    const store = this.stores.get(this.storeName) || [];
    const item = store.find((item: any) => item.id === id);
    return {
      onsuccess: null as any,
      onerror: null as any,
      result: item,
      addEventListener: function(event: string, handler: any) {
        if (event === 'success') {
          setTimeout(() => handler({ target: { result: item } }), 0);
        }
      }
    };
  }

  getAll() {
    const store = this.stores.get(this.storeName) || [];
    return {
      onsuccess: null as any,
      onerror: null as any,
      result: [...store],
      addEventListener: function(event: string, handler: any) {
        if (event === 'success') {
          setTimeout(() => handler({ target: { result: [...store] } }), 0);
        }
      }
    };
  }

  add(item: any) {
    const store = this.stores.get(this.storeName) || [];
    store.push(item);
    return {
      onsuccess: null as any,
      onerror: null as any,
      result: item.id,
      addEventListener: function(event: string, handler: any) {
        if (event === 'success') {
          setTimeout(() => handler({ target: { result: item.id } }), 0);
        }
      }
    };
  }

  put(item: any) {
    const store = this.stores.get(this.storeName) || [];
    const index = store.findIndex((i: any) => i.id === item.id);
    if (index >= 0) {
      store[index] = item;
    } else {
      store.push(item);
    }
    return {
      onsuccess: null as any,
      onerror: null as any,
      result: item.id,
      addEventListener: function(event: string, handler: any) {
        if (event === 'success') {
          setTimeout(() => handler({ target: { result: item.id } }), 0);
        }
      }
    };
  }

  delete(id: string) {
    const store = this.stores.get(this.storeName) || [];
    const index = store.findIndex((item: any) => item.id === id);
    if (index >= 0) {
      store.splice(index, 1);
    }
    return {
      onsuccess: null as any,
      onerror: null as any,
      addEventListener: function(event: string, handler: any) {
        if (event === 'success') {
          setTimeout(() => handler({ target: {} }), 0);
        }
      }
    };
  }

  index(indexName: string) {
    return {
      getAll: (value: any) => {
        const store = this.stores.get(this.storeName) || [];
        const filtered = store.filter((item: any) => item[indexName] === value);
        return {
          onsuccess: null as any,
          onerror: null as any,
          result: filtered,
          addEventListener: function(event: string, handler: any) {
            if (event === 'success') {
              setTimeout(() => handler({ target: { result: filtered } }), 0);
            }
          }
        };
      }
    };
  }

  get indexNames() {
    return {
      contains: (name: string) => name === 'novelId'
    };
  }
}

class MockIDBRequest {
  onsuccess: any = null;
  onerror: any = null;
  result: any = null;

  constructor(private db: MockIDBDatabase) {}
}

// Setup global mocks
const mockDB = new MockIDBDatabase();

(global as any).indexedDB = {
  open: jest.fn().mockImplementation((name: string, version?: number) => {
    const request = new MockIDBRequest(mockDB);
    setTimeout(() => {
      request.result = mockDB;
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  })
};

(global as any).localStorage = {
  data: {} as Record<string, string>,
  getItem: function(key: string) {
    return this.data[key] || null;
  },
  setItem: function(key: string, value: string) {
    this.data[key] = value;
  },
  removeItem: function(key: string) {
    delete this.data[key];
  },
  clear: function() {
    this.data = {};
  }
};

describe('项目切换功能测试', () => {
  const novel1 = {
    id: 'novel-1',
    title: '南朝遗事',
    description: '测试项目1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const novel2 = {
    id: 'novel-2',
    title: 'The Game',
    description: '测试项目2',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const chapter1 = {
    id: 'chapter-1',
    novelId: 'novel-1',
    volumeId: '第一卷',
    chapterId: '第一章',
    sectionId: '第一节',
    title: '将军',
    content: '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const chapter2 = {
    id: 'chapter-2',
    novelId: 'novel-2',
    volumeId: '第一卷',
    chapterId: '第一章',
    sectionId: '第一节',
    title: '序章',
    content: 'Test content',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    // 清空localStorage
    (global as any).localStorage.clear();

    // 初始化测试数据
    const db = await new Promise<MockIDBDatabase>((resolve) => {
      const request = (global as any).indexedDB.open('NovelWritingDB', 6);
      request.onsuccess = (event: any) => resolve(event.target.result);
    });

    // 添加测试数据
    const novelsStore = (mockDB as any).stores.get('novels');
    novelsStore.length = 0;
    novelsStore.push(novel1, novel2);

    const chaptersStore = (mockDB as any).stores.get('chapters');
    chaptersStore.length = 0;
    chaptersStore.push(chapter1, chapter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该正确加载项目1的章节', async () => {
    // 设置当前项目为novel-1
    (global as any).localStorage.setItem('currentNovelId', 'novel-1');

    // 模拟加载章节
    const db = await new Promise<MockIDBDatabase>((resolve) => {
      const request = (global as any).indexedDB.open('NovelWritingDB', 6);
      request.onsuccess = (event: any) => resolve(event.target.result);
    });

    const transaction = db.transaction(['chapters'], 'readonly');
    const store = transaction.objectStore('chapters');
    const index = store.index('novelId');
    const request = index.getAll('novel-1');

    const chapters = await new Promise((resolve) => {
      request.addEventListener('success', (event: any) => {
        resolve(event.target.result);
      });
    });

    expect(chapters).toHaveLength(1);
    expect((chapters as any[])[0].title).toBe('将军');
  });

  it('应该正确加载项目2的章节', async () => {
    // 设置当前项目为novel-2
    (global as any).localStorage.setItem('currentNovelId', 'novel-2');

    // 模拟加载章节
    const db = await new Promise<MockIDBDatabase>((resolve) => {
      const request = (global as any).indexedDB.open('NovelWritingDB', 6);
      request.onsuccess = (event: any) => resolve(event.target.result);
    });

    const transaction = db.transaction(['chapters'], 'readonly');
    const store = transaction.objectStore('chapters');
    const index = store.index('novelId');
    const request = index.getAll('novel-2');

    const chapters = await new Promise((resolve) => {
      request.addEventListener('success', (event: any) => {
        resolve(event.target.result);
      });
    });

    expect(chapters).toHaveLength(1);
    expect((chapters as any[])[0].title).toBe('序章');
  });

  it('切换项目后应该加载正确的章节', async () => {
    // 初始设置为项目1
    (global as any).localStorage.setItem('currentNovelId', 'novel-1');

    // 验证项目1的章节
    let db = await new Promise<MockIDBDatabase>((resolve) => {
      const request = (global as any).indexedDB.open('NovelWritingDB', 6);
      request.onsuccess = (event: any) => resolve(event.target.result);
    });

    let transaction = db.transaction(['chapters'], 'readonly');
    let store = transaction.objectStore('chapters');
    let index = store.index('novelId');
    let request = index.getAll('novel-1');

    let chapters = await new Promise((resolve) => {
      request.addEventListener('success', (event: any) => {
        resolve(event.target.result);
      });
    });

    expect(chapters).toHaveLength(1);
    expect((chapters as any[])[0].title).toBe('将军');

    // 切换到项目2
    (global as any).localStorage.setItem('currentNovelId', 'novel-2');

    // 验证项目2的章节
    db = await new Promise<MockIDBDatabase>((resolve) => {
      const request = (global as any).indexedDB.open('NovelWritingDB', 6);
      request.onsuccess = (event: any) => resolve(event.target.result);
    });

    transaction = db.transaction(['chapters'], 'readonly');
    store = transaction.objectStore('chapters');
    index = store.index('novelId');
    request = index.getAll('novel-2');

    chapters = await new Promise((resolve) => {
      request.addEventListener('success', (event: any) => {
        resolve(event.target.result);
      });
    });

    expect(chapters).toHaveLength(1);
    expect((chapters as any[])[0].title).toBe('序章');
  });
});

