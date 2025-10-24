/**
 * 请求工具函数
 * 处理API请求参数解析和验证
 */

import { NextRequest } from 'next/server';

/**
 * 从请求中获取模型参数
 * 优先从查询参数获取，回退到请求体参数（向后兼容）
 * @param req NextRequest对象
 * @param body 请求体对象（可选）
 * @returns 模型名称
 */
export function getModelFromRequest(req: NextRequest, body?: any): string {
  // 1. 优先从查询参数获取
  const { searchParams } = new URL(req.url);
  const modelFromQuery = searchParams.get('model');
  
  if (modelFromQuery) {
    return modelFromQuery;
  }
  
  // 2. 回退到body参数（向后兼容）
  return body?.model || 'GPT-4o-mini'; // 使用name格式，与现有代码一致
}

/**
 * 验证必需的查询参数
 * @param req NextRequest对象
 * @param requiredParams 必需参数列表
 * @returns 验证结果和错误信息
 */
export function validateQueryParams(req: NextRequest, requiredParams: string[]) {
  const { searchParams } = new URL(req.url);
  const missing: string[] = [];
  
  for (const param of requiredParams) {
    if (!searchParams.get(param)) {
      missing.push(param);
    }
  }
  
  return {
    isValid: missing.length === 0,
    missingParams: missing,
    errorMessage: missing.length > 0 ? `Missing required parameters: ${missing.join(', ')}` : null
  };
}

/**
 * 从请求中提取认证token
 * @param req NextRequest对象
 * @returns token字符串或null
 */
export function getAuthTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader === null || authHeader === undefined) return null;

  // 支持 "Bearer token" 和 "token" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * 创建标准的错误响应格式
 * @param code 错误代码
 * @param message 错误消息
 * @param status HTTP状态码
 * @returns 错误响应对象
 */
export function createErrorResponse(code: string, message: string, status: number = 400) {
  return {
    success: false,
    error: {
      code,
      message
    },
    status
  };
}

/**
 * 创建标准的成功响应格式
 * @param data 响应数据
 * @returns 成功响应对象
 */
export function createSuccessResponse(data: any) {
  return {
    success: true,
    data
  };
}

/**
 * 解析请求体并处理错误
 * @param req NextRequest对象
 * @returns 解析后的请求体或错误信息
 */
export async function parseRequestBody(req: NextRequest) {
  try {
    return await req.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}
