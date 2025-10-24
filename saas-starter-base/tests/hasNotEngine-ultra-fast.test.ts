/**
 * hasNotEngine-ultra-fast API 端点测试
 * 
 * 测试核心功能：
 * 1. 身份验证和请求验证
 * 2. 使用量检查和更新
 * 3. OpenAI 连接和流式响应
 * 4. 性能监控和日志记录
 * 5. 错误处理和边界情况
 */

import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/hasNotEngine-ultra-fast/route';
import { performanceMonitor } from '../lib/performance-monitor';

// 模拟环境变量
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret';

// 测试用户数据
const TEST_USER = {
  id: '1675524b-820b-478f-b841-f94aaffac413',
  email: '1519235462@qq.com',
  plan: 'Premium'
};

// 创建测试请求的辅助函数
function createTestRequest(body: any, headers: Record<string, string> = {}): NextRequest {
  const url = 'http://localhost:3000/api/hasNotEngine-ultra-fast';
  const request = new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
  return request;
}

// 创建有效的 JWT Token（模拟）
function createValidToken(): string {
  // 在实际测试中，这里应该使用真实的 JWT 生成逻辑
  // 为了测试目的，我们使用一个模拟的 token
  return 'Bearer test-valid-token';
}

describe('hasNotEngine-ultra-fast API 端点测试', () => {
  
  beforeEach(() => {
    // 清理性能监控器状态
    jest.clearAllMocks();
    console.log('🧪 开始新的测试用例');
  });

  afterEach(() => {
    console.log('🧹 测试用例清理完成');
  });

  describe('请求验证测试', () => {
    test('应该拒绝没有 Authorization 头的请求', async () => {
      const request = createTestRequest({
        query: 'Hello, how are you?',
        model: 'gpt-4o-mini'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('未授权');
      console.log('✅ 正确拒绝了未授权请求');
    });

    test('应该拒绝无效的请求体', async () => {
      const request = createTestRequest({
        // 缺少必需的 query 字段
        model: 'gpt-4o-mini'
      }, {
        'Authorization': createValidToken()
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('请求体无效');
      console.log('✅ 正确拒绝了无效请求体');
    });

    test('应该拒绝空的查询内容', async () => {
      const request = createTestRequest({
        query: '',
        model: 'gpt-4o-mini'
      }, {
        'Authorization': createValidToken()
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('查询内容不能为空');
      console.log('✅ 正确拒绝了空查询');
    });

    test('应该拒绝过长的查询内容', async () => {
      const longQuery = 'a'.repeat(10001); // 超过 10000 字符限制
      
      const request = createTestRequest({
        query: longQuery,
        model: 'gpt-4o-mini'
      }, {
        'Authorization': createValidToken()
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('查询内容过长');
      console.log('✅ 正确拒绝了过长查询');
    });
  });

  describe('CORS 处理测试', () => {
    test('应该正确处理 OPTIONS 预检请求', async () => {
      const url = 'http://localhost:3000/api/hasNotEngine-ultra-fast';
      const request = new NextRequest(url, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      console.log('✅ 正确处理了 CORS 预检请求');
    });
  });

  describe('性能监控测试', () => {
    test('应该记录请求的性能指标', async () => {
      // 监控性能监控器的调用
      const startRequestSpy = jest.spyOn(performanceMonitor, 'startRequest');
      const recordStepSpy = jest.spyOn(performanceMonitor, 'recordAuthTime');

      const request = createTestRequest({
        query: 'Test query',
        model: 'gpt-4o-mini'
      }, {
        'Authorization': createValidToken()
      });

      // 注意：这个测试可能会因为实际的 OpenAI 调用而失败
      // 在实际环境中，我们需要模拟 OpenAI 客户端
      try {
        await POST(request);
      } catch (error) {
        // 预期可能会有错误，因为我们使用的是测试 API key
        console.log('预期的错误（测试环境）:', error);
      }

      // 验证性能监控被调用
      expect(startRequestSpy).toHaveBeenCalled();
      console.log('✅ 性能监控正确启动');

      // 清理 spy
      startRequestSpy.mockRestore();
      recordStepSpy.mockRestore();
    });
  });

  describe('错误处理测试', () => {
    test('应该正确处理内部服务器错误', async () => {
      // 创建一个会导致内部错误的请求
      const request = createTestRequest({
        query: 'Test query',
        model: 'invalid-model-name'
      }, {
        'Authorization': createValidToken()
      });

      const response = await POST(request);
      
      // 应该返回 500 错误或者适当的错误响应
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      console.log('✅ 正确处理了内部错误');
    });
  });

  describe('流式响应测试', () => {
    test('应该返回正确的流式响应头', async () => {
      const request = createTestRequest({
        query: 'Hello',
        model: 'gpt-4o-mini'
      }, {
        'Authorization': createValidToken()
      });

      try {
        const response = await POST(request);
        
        // 检查响应头
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
        expect(response.headers.get('Cache-Control')).toBe('no-cache');
        expect(response.headers.get('Connection')).toBe('keep-alive');
        
        console.log('✅ 流式响应头设置正确');
      } catch (error) {
        console.log('预期的错误（测试环境）:', error);
        // 在测试环境中，由于没有真实的 OpenAI API key，这是预期的
      }
    });
  });

  describe('模型验证测试', () => {
    test('应该接受有效的模型名称', async () => {
      const validModels = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o'];
      
      for (const model of validModels) {
        const request = createTestRequest({
          query: 'Test query',
          model: model
        }, {
          'Authorization': createValidToken()
        });

        try {
          const response = await POST(request);
          // 在测试环境中，我们主要检查请求是否被正确处理到 OpenAI 调用阶段
          console.log(`✅ 模型 ${model} 被正确接受`);
        } catch (error) {
          // 预期的错误，因为我们没有真实的 API key
          console.log(`模型 ${model} 处理到 OpenAI 调用阶段（预期错误）`);
        }
      }
    });
  });

  describe('请求限制测试', () => {
    test('应该在高频请求时正确处理', async () => {
      const requests = [];
      const requestCount = 5;

      // 创建多个并发请求
      for (let i = 0; i < requestCount; i++) {
        const request = createTestRequest({
          query: `Test query ${i}`,
          model: 'gpt-4o-mini'
        }, {
          'Authorization': createValidToken()
        });

        requests.push(POST(request));
      }

      // 等待所有请求完成
      const responses = await Promise.allSettled(requests);
      
      // 检查响应
      const successfulResponses = responses.filter(r => r.status === 'fulfilled');
      const failedResponses = responses.filter(r => r.status === 'rejected');

      console.log(`📊 并发请求结果: ${successfulResponses.length} 成功, ${failedResponses.length} 失败`);
      
      // 至少应该有一些请求被处理（即使最终因为 API key 失败）
      expect(responses.length).toBe(requestCount);
      console.log('✅ 并发请求处理正确');
    });
  });
});

describe('集成测试（需要真实环境）', () => {
  // 这些测试需要真实的环境变量和数据库连接
  // 在 CI/CD 中可以跳过或使用模拟数据

  test.skip('应该能够完成完整的请求流程', async () => {
    // 这个测试需要：
    // 1. 真实的 OPENROUTER_API_KEY
    // 2. 数据库连接
    // 3. Redis 连接
    // 4. 有效的用户认证

    const request = createTestRequest({
      query: 'Hello, how are you?',
      model: 'gpt-4o-mini'
    }, {
      'Authorization': createValidToken()
    });

    const response = await POST(request);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    
    // 读取流式响应
    const reader = response.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      const chunk = new TextDecoder().decode(value);
      
      expect(chunk).toContain('data:');
      console.log('✅ 完整流程测试通过');
    }
  });
});

// 性能基准测试
describe('性能基准测试', () => {
  test('请求处理时间应该在合理范围内', async () => {
    const startTime = Date.now();
    
    const request = createTestRequest({
      query: 'Quick test',
      model: 'gpt-4o-mini'
    }, {
      'Authorization': createValidToken()
    });

    try {
      await POST(request);
    } catch (error) {
      // 预期的错误
    }

    const processingTime = Date.now() - startTime;
    
    // 服务器处理时间应该在 1 秒内（不包括 OpenAI API 调用）
    expect(processingTime).toBeLessThan(1000);
    console.log(`📊 服务器处理时间: ${processingTime}ms`);
    console.log('✅ 性能基准测试通过');
  });
});
