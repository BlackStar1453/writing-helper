/**
 * 请求工具函数测试
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { 
  getModelFromRequest, 
  validateQueryParams, 
  getAuthTokenFromRequest, 
  createErrorResponse, 
  createSuccessResponse, 
  parseRequestBody 
} from '@/lib/request-utils';

describe('请求工具函数测试', () => {
  describe('getModelFromRequest', () => {
    it('应该优先从查询参数获取model', () => {
      const req = new NextRequest('http://localhost:3000/api/test?model=GPT-4o');
      const body = { model: 'GPT-4o-mini' };
      
      const result = getModelFromRequest(req, body);
      expect(result).toBe('GPT-4o');
    });

    it('应该从body获取model作为回退', () => {
      const req = new NextRequest('http://localhost:3000/api/test');
      const body = { model: 'GPT-4o-mini' };
      
      const result = getModelFromRequest(req, body);
      expect(result).toBe('GPT-4o-mini');
    });

    it('应该返回默认值当没有model参数时', () => {
      const req = new NextRequest('http://localhost:3000/api/test');
      const body = {};
      
      const result = getModelFromRequest(req, body);
      expect(result).toBe('GPT-4o-mini');
    });

    it('应该处理没有body的情况', () => {
      const req = new NextRequest('http://localhost:3000/api/test?model=Claude');
      
      const result = getModelFromRequest(req);
      expect(result).toBe('Claude');
    });
  });

  describe('validateQueryParams', () => {
    it('应该验证必需的查询参数存在', () => {
      const req = new NextRequest('http://localhost:3000/api/test?model=GPT-4o&type=premium');
      
      const result = validateQueryParams(req, ['model', 'type']);
      expect(result.isValid).toBe(true);
      expect(result.missingParams).toEqual([]);
      expect(result.errorMessage).toBeNull();
    });

    it('应该检测缺失的查询参数', () => {
      const req = new NextRequest('http://localhost:3000/api/test?model=GPT-4o');
      
      const result = validateQueryParams(req, ['model', 'type', 'user']);
      expect(result.isValid).toBe(false);
      expect(result.missingParams).toEqual(['type', 'user']);
      expect(result.errorMessage).toBe('Missing required parameters: type, user');
    });

    it('应该处理空的必需参数列表', () => {
      const req = new NextRequest('http://localhost:3000/api/test');
      
      const result = validateQueryParams(req, []);
      expect(result.isValid).toBe(true);
      expect(result.missingParams).toEqual([]);
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('getAuthTokenFromRequest', () => {
    it('应该从Bearer格式的Authorization头获取token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'Authorization': 'Bearer abc123token' }
      });
      
      const result = getAuthTokenFromRequest(req);
      expect(result).toBe('abc123token');
    });

    it('应该从直接格式的Authorization头获取token', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'Authorization': 'abc123token' }
      });
      
      const result = getAuthTokenFromRequest(req);
      expect(result).toBe('abc123token');
    });

    it('应该在没有Authorization头时返回null', () => {
      const req = new NextRequest('http://localhost:3000/api/test');
      
      const result = getAuthTokenFromRequest(req);
      expect(result).toBeNull();
    });

    it('应该处理空的Authorization头', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'Authorization': '' }
      });
      
      const result = getAuthTokenFromRequest(req);
      expect(result).toBe('');
    });
  });

  describe('createErrorResponse', () => {
    it('应该创建标准错误响应', () => {
      const result = createErrorResponse('BAD_REQUEST', 'Invalid input');
      
      expect(result).toEqual({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid input'
        },
        status: 400
      });
    });

    it('应该支持自定义状态码', () => {
      const result = createErrorResponse('UNAUTHORIZED', 'Access denied', 401);
      
      expect(result).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access denied'
        },
        status: 401
      });
    });
  });

  describe('createSuccessResponse', () => {
    it('应该创建标准成功响应', () => {
      const data = { message: 'Success', count: 5 };
      const result = createSuccessResponse(data);
      
      expect(result).toEqual({
        success: true,
        data: {
          message: 'Success',
          count: 5
        }
      });
    });

    it('应该处理null数据', () => {
      const result = createSuccessResponse(null);
      
      expect(result).toEqual({
        success: true,
        data: null
      });
    });
  });

  describe('parseRequestBody', () => {
    it('应该解析有效的JSON请求体', async () => {
      const body = JSON.stringify({ model: 'GPT-4o', query: 'test' });
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await parseRequestBody(req);
      expect(result).toEqual({ model: 'GPT-4o', query: 'test' });
    });

    it('应该在无效JSON时抛出错误', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      await expect(parseRequestBody(req)).rejects.toThrow('Invalid JSON in request body');
    });
  });

  describe('API一致性测试', () => {
    it('使用量检查和更新应该使用相同的参数格式', () => {
      // 使用量检查: GET /api/usage/check?model=GPT-4o
      const checkReq = new NextRequest('http://localhost:3000/api/usage/check?model=GPT-4o');
      const checkModel = getModelFromRequest(checkReq);

      // 使用量更新: POST /api/usage/update?model=GPT-4o
      const updateReq = new NextRequest('http://localhost:3000/api/usage/update?model=GPT-4o');
      const updateModel = getModelFromRequest(updateReq);

      // 两个端点应该获取到相同的model参数
      expect(checkModel).toBe('GPT-4o');
      expect(updateModel).toBe('GPT-4o');
      expect(checkModel).toBe(updateModel);
    });
  });
});
