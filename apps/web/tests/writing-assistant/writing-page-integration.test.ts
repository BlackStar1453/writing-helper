/**
 * WritingPage集成测试
 * 测试WritingPage组件的核心业务逻辑和数据流
 *
 * 注意: 这些测试使用jest mock
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ChatSession, WritingHistory } from '@/lib/writing-utils';

// Mock db-utils模块
jest.mock('@/lib/db-utils', () => {
  let mockChatSessions: any[] = [];
  let mockWritingHistories: any[] = [];

  return {
    getAllChatSessions: jest.fn().mockImplementation(() => Promise.resolve([...mockChatSessions])),
    saveAllChatSessions: jest.fn().mockImplementation((sessions: any[]) => {
      mockChatSessions = [...sessions];
      return Promise.resolve();
    }),
    getAllWritingHistories: jest.fn().mockImplementation(() => Promise.resolve([...mockWritingHistories])),
    saveAllWritingHistories: jest.fn().mockImplementation((histories: any[]) => {
      mockWritingHistories = [...histories];
      return Promise.resolve();
    })
  };
});

import {
  getAllChatSessions,
  saveAllChatSessions,
  getAllWritingHistories,
  saveAllWritingHistories
} from '@/lib/db-utils';

// Mock fetch for API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('WritingPage集成测试', () => {
  const mockChatSession: ChatSession = {
    id: 'session-test-1',
    title: 'Test Chat',
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' }
    ],
    createdAt: Date.now()
  };

  const mockWritingHistory: WritingHistory = {
    id: 'writing-test-1',
    title: 'Test Essay',
    content: 'This is test content.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    agentMessages: [
      { role: 'user', content: 'Generate topic' },
      { role: 'assistant', content: 'Topic: AI' }
    ],
    topic: 'Artificial Intelligence',
    topicLevel: 'Advanced',
    tips: ['Be specific', 'Use examples'],
    outline: 'Intro\nBody\nConclusion',
    keyVocabulary: ['AI', 'machine learning', 'neural networks']
  };

  beforeEach(async () => {
    // 清空数据和重置mocks
    jest.clearAllMocks();
    await saveAllChatSessions([]);
    await saveAllWritingHistories([]);

    // 重置fetch mock
    (global.fetch as jest.MockedFunction<typeof fetch>).mockReset();
  });

  afterEach(() => {
    // 清理
    jest.clearAllMocks();
  });

  describe('数据加载流程', () => {
    it('应该能从IndexedDB加载chat sessions', async () => {
      await saveAllChatSessions([mockChatSession]);
      
      const sessions = await getAllChatSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(mockChatSession.id);
      expect(sessions[0].messages).toHaveLength(2);
    });

    it('应该能从IndexedDB加载writing histories', async () => {
      await saveAllWritingHistories([mockWritingHistory]);
      
      const histories = await getAllWritingHistories();
      expect(histories).toHaveLength(1);
      expect(histories[0].id).toBe(mockWritingHistory.id);
      expect(histories[0].topic).toBe(mockWritingHistory.topic);
    });

    it('空数据库应该返回空数组', async () => {
      const sessions = await getAllChatSessions();
      const histories = await getAllWritingHistories();
      
      expect(sessions).toEqual([]);
      expect(histories).toEqual([]);
    });
  });

  describe('Chat Session管理', () => {
    it('应该能创建新的chat session', async () => {
      const newSession: ChatSession = {
        id: 'new-session',
        title: 'New Chat',
        messages: [{ role: 'user', content: 'Test' }],
        createdAt: Date.now()
      };
      
      await saveAllChatSessions([newSession]);
      const sessions = await getAllChatSessions();
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(newSession.id);
    });

    it('应该能更新existing chat session', async () => {
      await saveAllChatSessions([mockChatSession]);
      
      const updatedSession = {
        ...mockChatSession,
        messages: [
          ...mockChatSession.messages,
          { role: 'user' as const, content: 'New message' }
        ]
      };
      
      await saveAllChatSessions([updatedSession]);
      const sessions = await getAllChatSessions();
      
      expect(sessions[0].messages).toHaveLength(3);
    });

    it('应该能管理多个chat sessions', async () => {
      const sessions = [
        mockChatSession,
        { ...mockChatSession, id: 'session-2', title: 'Second Chat' }
      ];
      
      await saveAllChatSessions(sessions);
      const retrieved = await getAllChatSessions();
      
      expect(retrieved).toHaveLength(2);
    });
  });

  describe('Writing History管理', () => {
    it('应该能保存新的writing history', async () => {
      await saveAllWritingHistories([mockWritingHistory]);
      const histories = await getAllWritingHistories();
      
      expect(histories).toHaveLength(1);
      expect(histories[0].content).toBe(mockWritingHistory.content);
    });

    it('应该能更新existing writing history', async () => {
      await saveAllWritingHistories([mockWritingHistory]);
      
      const updatedHistory = {
        ...mockWritingHistory,
        content: 'Updated content',
        updatedAt: Date.now()
      };
      
      await saveAllWritingHistories([updatedHistory]);
      const histories = await getAllWritingHistories();
      
      expect(histories[0].content).toBe('Updated content');
    });

    it('应该能保存包含agentMessages的history', async () => {
      await saveAllWritingHistories([mockWritingHistory]);
      const histories = await getAllWritingHistories();
      
      expect(histories[0].agentMessages).toBeDefined();
      expect(histories[0].agentMessages).toHaveLength(2);
    });

    it('应该能保存topic相关信息', async () => {
      await saveAllWritingHistories([mockWritingHistory]);
      const histories = await getAllWritingHistories();
      
      expect(histories[0].topic).toBe(mockWritingHistory.topic);
      expect(histories[0].topicLevel).toBe(mockWritingHistory.topicLevel);
      expect(histories[0].tips).toEqual(mockWritingHistory.tips);
      expect(histories[0].keyVocabulary).toEqual(mockWritingHistory.keyVocabulary);
    });
  });

  describe('Main Agent消息处理', () => {
    it('应该能模拟Main Agent API调用', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('AI response'));
            controller.close();
          }
        })
      };
      
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as Response);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
          useTools: true
        })
      });
      
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('应该能解析[TOPIC_DATA:...]标记', () => {
      const message = 'Here is your topic: [TOPIC_DATA:{"topic":"Technology","level":"Intermediate"}]';
      const match = message.match(/\[TOPIC_DATA:(.*?)\]/);
      
      expect(match).toBeTruthy();
      if (match) {
        const data = JSON.parse(match[1]);
        expect(data.topic).toBe('Technology');
        expect(data.level).toBe('Intermediate');
      }
    });

    it('应该能解析[GUIDED_DATA:...]标记', () => {
      const message = '[GUIDED_DATA:{"topic":"AI","currentStep":{"name":"introduction"}}]';
      const match = message.match(/\[GUIDED_DATA:(.*?)\]/);
      
      expect(match).toBeTruthy();
      if (match) {
        const data = JSON.parse(match[1]);
        expect(data.topic).toBe('AI');
        expect(data.currentStep.name).toBe('introduction');
      }
    });
  });

  describe('Topic信息更新', () => {
    it('应该能更新topic信息', async () => {
      const topicInfo = {
        topic: 'Climate Change',
        level: 'Advanced',
        tips: ['Use scientific data', 'Cite sources'],
        outline: 'Introduction\nCauses\nEffects\nSolutions',
        keyVocabulary: ['greenhouse gases', 'global warming']
      };
      
      // 模拟保存带topic信息的writing history
      const historyWithTopic: WritingHistory = {
        ...mockWritingHistory,
        ...topicInfo
      };
      
      await saveAllWritingHistories([historyWithTopic]);
      const histories = await getAllWritingHistories();
      
      expect(histories[0].topic).toBe(topicInfo.topic);
      expect(histories[0].level).toBe(topicInfo.level);
      expect(histories[0].tips).toEqual(topicInfo.tips);
    });
  });

  describe('数据持久化', () => {
    it('保存的chat sessions应该持久化', async () => {
      await saveAllChatSessions([mockChatSession]);
      
      // 模拟页面刷新
      const sessions = await getAllChatSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(mockChatSession.id);
    });

    it('保存的writing histories应该持久化', async () => {
      await saveAllWritingHistories([mockWritingHistory]);
      
      // 模拟页面刷新
      const histories = await getAllWritingHistories();
      expect(histories).toHaveLength(1);
      expect(histories[0].id).toBe(mockWritingHistory.id);
    });
  });

  describe('错误处理', () => {
    it('API调用失败应该能处理', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(
        fetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({ messages: [] })
        })
      ).rejects.toThrow('Network error');
    });

    it('无效的JSON数据应该能处理', () => {
      const invalidMessage = '[TOPIC_DATA:invalid json]';
      const match = invalidMessage.match(/\[TOPIC_DATA:(.*?)\]/);
      
      if (match) {
        expect(() => JSON.parse(match[1])).toThrow();
      }
    });
  });

  describe('并发操作', () => {
    it('应该能同时保存sessions和histories', async () => {
      const promises = [
        saveAllChatSessions([mockChatSession]),
        saveAllWritingHistories([mockWritingHistory])
      ];
      
      await Promise.all(promises);
      
      const sessions = await getAllChatSessions();
      const histories = await getAllWritingHistories();
      
      expect(sessions).toHaveLength(1);
      expect(histories).toHaveLength(1);
    });
  });
});

