/**
 * 模型工具函数测试
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  getModelInfo, 
  getModelTypeFromName, 
  createModelCache, 
  isValidModel, 
  getAllModelNames, 
  getModelsByType 
} from '@/lib/model-utils';

// Mock models data
jest.mock('@/lib/models-data', () => ({
  models: [
    { name: 'GPT-4o', id: 'openai/gpt-4o', modelType: 'premium', provider: 'OpenAI' },
    { name: 'GPT-4o-mini', id: 'openai/gpt-4o-mini', modelType: 'basic', provider: 'OpenAI' },
    { name: 'Claude 3.5 Sonnet', id: 'anthropic/claude-3.5-sonnet', modelType: 'premium', provider: 'Anthropic' },
    { name: 'Claude 3.5 Haiku', id: 'anthropic/claude-3.5-haiku', modelType: 'basic', provider: 'Anthropic' }
  ]
}));

describe('模型工具函数测试', () => {
  describe('getModelInfo', () => {
    it('应该通过模型名称找到模型', () => {
      const result = getModelInfo('GPT-4o');
      expect(result.name).toBe('GPT-4o');
      expect(result.id).toBe('openai/gpt-4o');
      expect(result.modelType).toBe('premium');
      expect(result.provider).toBe('OpenAI');
    });

    it('应该通过模型ID找到模型', () => {
      const result = getModelInfo('openai/gpt-4o-mini');
      expect(result.name).toBe('GPT-4o-mini');
      expect(result.id).toBe('openai/gpt-4o-mini');
      expect(result.modelType).toBe('basic');
      expect(result.provider).toBe('OpenAI');
    });

    it('应该为未知模型返回默认值', () => {
      const result = getModelInfo('unknown-model');
      expect(result.name).toBe('GPT-4o-mini');
      expect(result.id).toBe('openai/gpt-4o-mini');
      expect(result.modelType).toBe('basic');
      expect(result.provider).toBe('OpenAI');
    });

    it('应该优先按名称匹配', () => {
      // 如果有同名的name和id，应该优先匹配name
      const result = getModelInfo('GPT-4o');
      expect(result.name).toBe('GPT-4o');
      expect(result.modelType).toBe('premium');
    });
  });

  describe('getModelTypeFromName', () => {
    it('应该返回正确的模型类型', () => {
      expect(getModelTypeFromName('GPT-4o')).toBe('premium');
      expect(getModelTypeFromName('GPT-4o-mini')).toBe('basic');
      expect(getModelTypeFromName('Claude 3.5 Sonnet')).toBe('premium');
      expect(getModelTypeFromName('Claude 3.5 Haiku')).toBe('basic');
    });

    it('应该为未知模型返回basic类型', () => {
      expect(getModelTypeFromName('unknown-model')).toBe('basic');
    });

    it('应该支持通过ID获取类型', () => {
      expect(getModelTypeFromName('openai/gpt-4o')).toBe('premium');
      expect(getModelTypeFromName('anthropic/claude-3.5-haiku')).toBe('basic');
    });
  });

  describe('createModelCache', () => {
    it('应该创建正确的模型缓存', () => {
      const cache = createModelCache();
      
      expect(cache.get('GPT-4o')).toBeDefined();
      expect(cache.get('GPT-4o-mini')).toBeDefined();
      expect(cache.get('Claude 3.5 Sonnet')).toBeDefined();
      expect(cache.get('Claude 3.5 Haiku')).toBeDefined();
      
      const gpt4o = cache.get('GPT-4o');
      expect(gpt4o.id).toBe('openai/gpt-4o');
      expect(gpt4o.modelType).toBe('premium');
    });

    it('缓存应该按模型名称建立索引', () => {
      const cache = createModelCache();
      
      // 应该能通过name获取
      expect(cache.get('GPT-4o')).toBeDefined();
      
      // 不应该能通过id获取（缓存只按name建立索引）
      expect(cache.get('openai/gpt-4o')).toBeUndefined();
    });
  });

  describe('isValidModel', () => {
    it('应该验证有效的模型名称', () => {
      expect(isValidModel('GPT-4o')).toBe(true);
      expect(isValidModel('GPT-4o-mini')).toBe(true);
      expect(isValidModel('Claude 3.5 Sonnet')).toBe(true);
    });

    it('应该验证有效的模型ID', () => {
      expect(isValidModel('openai/gpt-4o')).toBe(true);
      expect(isValidModel('openai/gpt-4o-mini')).toBe(true);
      expect(isValidModel('anthropic/claude-3.5-sonnet')).toBe(true);
    });

    it('应该拒绝无效的模型', () => {
      expect(isValidModel('invalid-model')).toBe(false);
      expect(isValidModel('unknown/model')).toBe(false);
      expect(isValidModel('')).toBe(false);
    });
  });

  describe('getAllModelNames', () => {
    it('应该返回所有模型名称', () => {
      const names = getAllModelNames();
      
      expect(names).toContain('GPT-4o');
      expect(names).toContain('GPT-4o-mini');
      expect(names).toContain('Claude 3.5 Sonnet');
      expect(names).toContain('Claude 3.5 Haiku');
      expect(names).toHaveLength(4);
    });
  });

  describe('getModelsByType', () => {
    it('应该返回指定类型的模型', () => {
      const premiumModels = getModelsByType('premium');
      const basicModels = getModelsByType('basic');
      
      expect(premiumModels).toHaveLength(2);
      expect(basicModels).toHaveLength(2);
      
      expect(premiumModels.every(m => m.modelType === 'premium')).toBe(true);
      expect(basicModels.every(m => m.modelType === 'basic')).toBe(true);
      
      expect(premiumModels.map(m => m.name)).toContain('GPT-4o');
      expect(premiumModels.map(m => m.name)).toContain('Claude 3.5 Sonnet');
      
      expect(basicModels.map(m => m.name)).toContain('GPT-4o-mini');
      expect(basicModels.map(m => m.name)).toContain('Claude 3.5 Haiku');
    });
  });
});
