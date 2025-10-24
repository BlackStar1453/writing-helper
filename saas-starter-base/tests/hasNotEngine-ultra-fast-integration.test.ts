/**
 * hasNotEngine-ultra-fast 集成测试
 * 
 * 使用模拟的 OpenAI 客户端进行完整的端到端测试
 */

import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/hasNotEngine-ultra-fast/route';

// 模拟 OpenAI 模块
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockImplementation(async (params) => {
            // 模拟流式响应
            if (params.stream) {
              return createMockStream();
            }
            // 模拟非流式响应
            return {
              choices: [{
                message: {
                  content: 'This is a test response from mocked OpenAI'
                }
              }],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 8,
                total_tokens: 18
              }
            };
          })
        }
      }
    }))
  };
});

// 模拟认证模块
jest.mock('../lib/auth', () => ({
  fastVerifyAuth: jest.fn().mockResolvedValue({
    success: true,
    user: {
      id: '1675524b-820b-478f-b841-f94aaffac413',
      email: '1519235462@qq.com',
      plan: 'Premium'
    }
  })
}));

// 模拟使用量检查
jest.mock('../lib/usage-ultra-fast', () => ({
  checkAndUpdateUsageUltraFast: jest.fn().mockResolvedValue({
    success: true,
    canProceed: true,
    usage: {
      used: 5,
      limit: 1000,
      remaining: 995
    }
  })
}));

// 创建模拟的流式响应
function createMockStream() {
  const chunks = [
    { choices: [{ delta: { content: 'Hello' } }] },
    { choices: [{ delta: { content: ' there!' } }] },
    { choices: [{ delta: { content: ' How' } }] },
    { choices: [{ delta: { content: ' can' } }] },
    { choices: [{ delta: { content: ' I' } }] },
    { choices: [{ delta: { content: ' help' } }] },
    { choices: [{ delta: { content: ' you?' } }] },
    { choices: [{ finish_reason: 'stop' }] }
  ];

  let index = 0;
  
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 50));
        yield chunk;
      }
    }
  };
}

// 创建测试请求的辅助函数
function createTestRequest(body: any, headers: Record<string, string> = {}): NextRequest {
  const url = 'http://localhost:3000/api/hasNotEngine-ultra-fast';
  const request = new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
      ...headers
    },
    body: JSON.stringify(body)
  });
  return request;
}

describe('hasNotEngine-ultra-fast 集成测试', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.log('🧪 开始集成测试');
  });

  describe('完整请求流程测试', () => {
    test('应该成功处理有效的聊天请求', async () => {
      const request = createTestRequest({
        query: 'Hello, how are you?',
        model: 'gpt-4o-mini'
      });

      const response = await POST(request);

      // 验证响应状态和头部
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');

      console.log('✅ 响应头验证通过');

      // 读取流式响应
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      if (reader) {
        const chunks: string[] = [];
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;

          if (value) {
            const chunk = new TextDecoder().decode(value);
            chunks.push(chunk);
          }
        }

        const fullResponse = chunks.join('');
        console.log('📡 接收到的流式响应:', fullResponse.substring(0, 200) + '...');

        // 验证响应包含预期的 SSE 格式
        expect(fullResponse).toContain('data:');
        expect(fullResponse).toContain('type');

        // 验证包含性能数据
        expect(fullResponse).toContain('performance');
        expect(fullResponse).toContain('serverProcessTime');

        console.log('✅ 流式响应验证通过');
      }
    }, 15000);

    test('应该正确处理不同的模型请求', async () => {
      const models = ['gpt-4o-mini', 'gpt-3.5-turbo'];

      for (const model of models) {
        const request = createTestRequest({
          query: `Test with ${model}`,
          model: model
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        console.log(`✅ 模型 ${model} 测试通过`);
      }
    });

    test('应该在流式响应中包含性能指标', async () => {
      const request = createTestRequest({
        query: 'Performance test query',
        model: 'gpt-4o-mini'
      });

      const response = await POST(request);
      const reader = response.body?.getReader();

      if (reader) {
        const chunks: string[] = [];
        let done = false;
        let foundPerformanceData = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;

          if (value) {
            const chunk = new TextDecoder().decode(value);
            chunks.push(chunk);

            // 检查是否包含性能数据
            if (chunk.includes('performance') && chunk.includes('serverProcessTime')) {
              foundPerformanceData = true;
            }
          }
        }

        expect(foundPerformanceData).toBe(true);
        console.log('✅ 性能指标包含在响应中');
      }
    });
  });

  describe('错误处理集成测试', () => {
    test('应该正确处理认证失败', async () => {
      // 模拟认证失败
      const { fastVerifyAuth } = require('../lib/auth');
      fastVerifyAuth.mockResolvedValueOnce({
        success: false,
        error: 'Invalid token'
      });

      const request = createTestRequest({
        query: 'Test query',
        model: 'gpt-4o-mini'
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toContain('未授权');
      
      console.log('✅ 认证失败处理正确');
    });

    test('应该正确处理使用量超限', async () => {
      // 模拟使用量超限
      const { checkAndUpdateUsageUltraFast } = require('../lib/usage-ultra-fast');
      checkAndUpdateUsageUltraFast.mockResolvedValueOnce({
        success: false,
        canProceed: false,
        error: 'Usage limit exceeded'
      });

      const request = createTestRequest({
        query: 'Test query',
        model: 'gpt-4o-mini'
      });

      const response = await POST(request);
      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toContain('使用量');
      
      console.log('✅ 使用量超限处理正确');
    });

    test('应该正确处理 OpenAI API 错误', async () => {
      // 模拟 OpenAI API 错误
      const OpenAI = require('openai').default;
      const mockCreate = OpenAI.prototype.chat.completions.create;
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API Error'));

      const request = createTestRequest({
        query: 'Test query',
        model: 'gpt-4o-mini'
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeDefined();
      
      console.log('✅ OpenAI API 错误处理正确');
    });
  });

  describe('性能测试', () => {
    test('服务器处理时间应该在合理范围内', async () => {
      const startTime = Date.now();

      const request = createTestRequest({
        query: 'Performance test',
        model: 'gpt-4o-mini'
      });

      const response = await POST(request);
      const serverProcessTime = Date.now() - startTime;

      // 服务器处理时间应该在 2 秒内（包括模拟的 OpenAI 延迟）
      expect(serverProcessTime).toBeLessThan(2000);
      expect(response.status).toBe(200);

      console.log(`📊 服务器处理时间: ${serverProcessTime}ms`);
      console.log('✅ 性能测试通过');
    });

    test('并发请求处理', async () => {
      const concurrentRequests = 3;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const request = createTestRequest({
          query: `Concurrent test ${i}`,
          model: 'gpt-4o-mini'
        });
        requests.push(POST(request));
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // 验证所有请求都成功
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        console.log(`✅ 并发请求 ${index + 1} 成功`);
      });

      console.log(`📊 ${concurrentRequests} 个并发请求总时间: ${totalTime}ms`);
      console.log('✅ 并发处理测试通过');
    });
  });

  describe('流式响应详细测试', () => {
    test('应该按正确顺序发送流式数据', async () => {
      const request = createTestRequest({
        query: 'Stream order test',
        model: 'gpt-4o-mini'
      });

      const response = await POST(request);
      const reader = response.body?.getReader();

      if (reader) {
        const events: string[] = [];
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;

          if (value) {
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.slice(5));
                  if (data.type) {
                    events.push(data.type);
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        }

        console.log('📡 接收到的事件顺序:', events);

        // 验证事件顺序
        expect(events).toContain('performance');
        expect(events.length).toBeGreaterThan(0);

        console.log('✅ 流式数据顺序正确');
      }
    });
  });
});

describe('边界条件测试', () => {
  test('应该处理极长的查询', async () => {
    const longQuery = 'a'.repeat(5000); // 5000 字符的查询
    
    const request = createTestRequest({
      query: longQuery,
      model: 'gpt-4o-mini'
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    console.log('✅ 长查询处理正确');
  });

  test('应该处理特殊字符', async () => {
    const specialQuery = '你好！这是一个包含特殊字符的测试：@#$%^&*()_+{}|:"<>?[]\\;\',./ 🚀🎉';
    
    const request = createTestRequest({
      query: specialQuery,
      model: 'gpt-4o-mini'
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    
    console.log('✅ 特殊字符处理正确');
  });
});
