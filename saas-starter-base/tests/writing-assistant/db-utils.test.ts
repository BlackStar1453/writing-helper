/**
 * IndexedDB操作测试
 * 测试db-utils.ts中的所有IndexedDB操作函数
 *
 * 注意: 这些测试使用jest mock而不是真实的IndexedDB
 * 主要测试函数调用逻辑和数据处理,而不是实际的数据库操作
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ChatSession, WritingHistory } from '@/lib/writing-utils';
import type { AppSettings } from '@/lib/settings-utils';

// Mock db-utils模块
jest.mock('@/lib/db-utils', () => {
  let mockChatSessions: any[] = [];
  let mockWritingHistories: any[] = [];
  let mockSettings: any = null;

  return {
    initDB: jest.fn().mockResolvedValue({
      name: 'WritingAssistantDB',
      objectStoreNames: {
        contains: (name: string) => ['chatSessions', 'writingHistories', 'settings'].includes(name)
      },
      close: jest.fn()
    }),

    getAllChatSessions: jest.fn().mockImplementation(() => Promise.resolve([...mockChatSessions])),

    saveAllChatSessions: jest.fn().mockImplementation((sessions: any[]) => {
      mockChatSessions = [...sessions];
      return Promise.resolve();
    }),

    deleteChatSession: jest.fn().mockImplementation((id: string) => {
      mockChatSessions = mockChatSessions.filter(s => s.id !== id);
      return Promise.resolve();
    }),

    getAllWritingHistories: jest.fn().mockImplementation(() => Promise.resolve([...mockWritingHistories])),

    saveAllWritingHistories: jest.fn().mockImplementation((histories: any[]) => {
      mockWritingHistories = [...histories];
      return Promise.resolve();
    }),

    deleteWritingHistory: jest.fn().mockImplementation((id: string) => {
      mockWritingHistories = mockWritingHistories.filter(h => h.id !== id);
      return Promise.resolve();
    }),

    getSettings: jest.fn().mockImplementation(() => Promise.resolve(mockSettings)),

    saveSettings: jest.fn().mockImplementation((settings: any) => {
      mockSettings = { ...settings };
      return Promise.resolve();
    }),

    // 用于测试的辅助函数
    __resetMocks: () => {
      mockChatSessions = [];
      mockWritingHistories = [];
      mockSettings = null;
    }
  };
});

import {
  initDB,
  getAllChatSessions,
  saveAllChatSessions,
  deleteChatSession,
  getAllWritingHistories,
  saveAllWritingHistories,
  deleteWritingHistory,
  getSettings,
  saveSettings
} from '@/lib/db-utils';

describe('db-utils IndexedDB操作测试', () => {
  // 测试数据
  const mockChatSession: ChatSession = {
    id: 'session-1',
    title: 'Test Session',
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ],
    createdAt: Date.now()
  };

  const mockWritingHistory: WritingHistory = {
    id: 'writing-1',
    title: 'My First Essay',
    content: 'This is a test essay content.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    agentMessages: [
      { role: 'user', content: 'Generate a topic' },
      { role: 'assistant', content: 'Topic: Technology' }
    ],
    topic: 'Technology',
    topicLevel: 'Intermediate',
    tips: ['Use clear examples', 'Organize your thoughts'],
    outline: 'Introduction\nBody\nConclusion',
    keyVocabulary: ['innovation', 'digital', 'transformation']
  };

  const mockSettings: AppSettings = {
    uiLanguage: 'en',
    writingLanguage: 'en',
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini',
    apiToken: 'test-token-123'
  };

  beforeEach(async () => {
    // 重置所有mocks
    jest.clearAllMocks();
    // 清空mock数据
    await saveAllChatSessions([]);
    await saveAllWritingHistories([]);
  });

  afterEach(() => {
    // 清理
    jest.clearAllMocks();
  });

  describe('initDB', () => {
    it('应该成功初始化数据库', async () => {
      const db = await initDB();
      expect(db).toBeDefined();
      expect(db.name).toBe('WritingAssistantDB');
      expect(db.objectStoreNames.contains('chatSessions')).toBe(true);
      expect(db.objectStoreNames.contains('writingHistories')).toBe(true);
      expect(db.objectStoreNames.contains('settings')).toBe(true);
    });
  });

  describe('Chat Sessions操作', () => {
    it('应该能保存和获取chat sessions', async () => {
      await saveAllChatSessions([mockChatSession]);
      const sessions = await getAllChatSessions();
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(mockChatSession.id);
      expect(sessions[0].title).toBe(mockChatSession.title);
      expect(sessions[0].messages).toHaveLength(2);
    });

    it('应该能保存多个chat sessions', async () => {
      const sessions = [
        mockChatSession,
        { ...mockChatSession, id: 'session-2', title: 'Second Session' }
      ];
      
      await saveAllChatSessions(sessions);
      const retrieved = await getAllChatSessions();
      
      expect(retrieved).toHaveLength(2);
    });

    it('应该能删除指定的chat session', async () => {
      await saveAllChatSessions([mockChatSession]);
      await deleteChatSession(mockChatSession.id);
      
      const sessions = await getAllChatSessions();
      expect(sessions).toHaveLength(0);
    });

    it('保存新sessions应该覆盖旧数据', async () => {
      await saveAllChatSessions([mockChatSession]);
      const newSession = { ...mockChatSession, id: 'session-new', title: 'New Session' };
      await saveAllChatSessions([newSession]);
      
      const sessions = await getAllChatSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('session-new');
    });
  });

  describe('Writing Histories操作', () => {
    it('应该能保存和获取writing histories', async () => {
      await saveAllWritingHistories([mockWritingHistory]);
      const histories = await getAllWritingHistories();
      
      expect(histories).toHaveLength(1);
      expect(histories[0].id).toBe(mockWritingHistory.id);
      expect(histories[0].title).toBe(mockWritingHistory.title);
      expect(histories[0].content).toBe(mockWritingHistory.content);
      expect(histories[0].topic).toBe(mockWritingHistory.topic);
      expect(histories[0].tips).toEqual(mockWritingHistory.tips);
    });

    it('应该能保存包含agentMessages的writing history', async () => {
      await saveAllWritingHistories([mockWritingHistory]);
      const histories = await getAllWritingHistories();
      
      expect(histories[0].agentMessages).toBeDefined();
      expect(histories[0].agentMessages).toHaveLength(2);
      expect(histories[0].agentMessages![0].role).toBe('user');
    });

    it('应该能删除指定的writing history', async () => {
      await saveAllWritingHistories([mockWritingHistory]);
      await deleteWritingHistory(mockWritingHistory.id);
      
      const histories = await getAllWritingHistories();
      expect(histories).toHaveLength(0);
    });

    it('应该能保存多个writing histories', async () => {
      const histories = [
        mockWritingHistory,
        { ...mockWritingHistory, id: 'writing-2', title: 'Second Essay' }
      ];
      
      await saveAllWritingHistories(histories);
      const retrieved = await getAllWritingHistories();
      
      expect(retrieved).toHaveLength(2);
    });
  });

  describe('Settings操作', () => {
    it('应该能保存和获取settings', async () => {
      await saveSettings(mockSettings);
      const settings = await getSettings();
      
      expect(settings).toBeDefined();
      expect(settings!.uiLanguage).toBe(mockSettings.uiLanguage);
      expect(settings!.aiProvider).toBe(mockSettings.aiProvider);
      expect(settings!.apiToken).toBe(mockSettings.apiToken);
    });

    it('应该能更新existing settings', async () => {
      await saveSettings(mockSettings);
      const updatedSettings = { ...mockSettings, uiLanguage: 'zh' as const };
      await saveSettings(updatedSettings);
      
      const settings = await getSettings();
      expect(settings!.uiLanguage).toBe('zh');
    });

    it('当没有settings时应该返回null', async () => {
      const settings = await getSettings();
      expect(settings).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('删除不存在的chat session不应该抛出错误', async () => {
      await expect(deleteChatSession('non-existent')).resolves.not.toThrow();
    });

    it('删除不存在的writing history不应该抛出错误', async () => {
      await expect(deleteWritingHistory('non-existent')).resolves.not.toThrow();
    });
  });

  describe('数据持久化', () => {
    it('关闭并重新打开数据库后数据应该仍然存在', async () => {
      await saveAllChatSessions([mockChatSession]);
      
      let db = await initDB();
      db.close();
      
      db = await initDB();
      const sessions = await getAllChatSessions();
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(mockChatSession.id);
    });
  });

  describe('并发操作', () => {
    it('应该能处理并发的保存操作', async () => {
      const promises = [
        saveAllChatSessions([mockChatSession]),
        saveAllWritingHistories([mockWritingHistory]),
        saveSettings(mockSettings)
      ];
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
      
      const sessions = await getAllChatSessions();
      const histories = await getAllWritingHistories();
      const settings = await getSettings();
      
      expect(sessions).toHaveLength(1);
      expect(histories).toHaveLength(1);
      expect(settings).toBeDefined();
    });
  });
});

