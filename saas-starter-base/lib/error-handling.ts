import { NextRequest, NextResponse } from 'next/server'
import { NextApiRequest, NextApiResponse } from 'next'
import { verifyAuth } from './auth'
import { getBaseUrl } from './utils'

// 错误代码定义
export const SERVER_ERROR_CODES = {
  // 认证相关错误
  USER_UNAUTHORIZED: 'USER_UNAUTHORIZED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // 使用量相关错误
  PREMIUM_LIMIT_EXCEEDED: 'PREMIUM_LIMIT_EXCEEDED',
  FAST_LIMIT_EXCEEDED: 'FAST_LIMIT_EXCEEDED',
  BASIC_LIMIT_EXCEEDED: 'BASIC_LIMIT_EXCEEDED', // 兼容旧代码
  
  // 系统错误
  USAGE_ERROR: 'USAGE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const

export type ServerErrorCode = typeof SERVER_ERROR_CODES[keyof typeof SERVER_ERROR_CODES]

// 错误详情接口
export interface ErrorDetails {
  currentUsage?: {
    used: number
    limit: number
    remaining: number
  }
  upgradeUrl?: string
  supportUrl?: string
  canRetry?: boolean
  retryAfter?: number
  additionalInfo?: Record<string, any>
}

// 统一错误响应接口
export interface ErrorResponse {
  success: false
  error: {
    code: ServerErrorCode
    message: string
    details?: ErrorDetails
  }
  requestId?: string
  timestamp: string
}

// 统一成功响应接口
export interface SuccessResponse<T = any> {
  success: true
  data: T
  requestId?: string
  timestamp: string
}

// 自定义错误类
export class NextJSUsageError extends Error {
  public readonly code: ServerErrorCode
  public readonly status: number
  public readonly details?: ErrorDetails

  constructor(
    code: ServerErrorCode,
    message: string,
    details?: ErrorDetails,
    status?: number
  ) {
    super(message)
    this.name = 'NextJSUsageError'
    this.code = code
    this.details = details
    
    // 根据错误代码设置默认状态码
    this.status = status || this.getDefaultStatus(code)
  }

  private getDefaultStatus(code: ServerErrorCode): number {
    switch (code) {
      case SERVER_ERROR_CODES.USER_UNAUTHORIZED:
      case SERVER_ERROR_CODES.INVALID_TOKEN:
        return 401
      case SERVER_ERROR_CODES.USER_NOT_FOUND:
        return 404
      case SERVER_ERROR_CODES.PREMIUM_LIMIT_EXCEEDED:
      case SERVER_ERROR_CODES.FAST_LIMIT_EXCEEDED:
      case SERVER_ERROR_CODES.BASIC_LIMIT_EXCEEDED:
        return 403
      case SERVER_ERROR_CODES.VALIDATION_ERROR:
        return 400
      case SERVER_ERROR_CODES.DATABASE_ERROR:
      case SERVER_ERROR_CODES.INTERNAL_ERROR:
      default:
        return 500
    }
  }

  // 转换为错误响应格式
  toErrorResponse(requestId?: string): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details })
      },
      ...(requestId && { requestId }),
      timestamp: new Date().toISOString()
    }
  }
}

// 获取请求ID
export function getRequestId(req: NextRequest | NextApiRequest): string {
  if ('headers' in req && typeof req.headers.get === 'function') {
    // NextRequest (App Router)
    return (req as NextRequest).headers.get('x-request-id') || crypto.randomUUID()
  } else {
    // NextApiRequest (Pages Router)
    return (req as NextApiRequest).headers['x-request-id'] as string || crypto.randomUUID()
  }
}

// 创建成功响应
export function createSuccessResponse<T>(
  data: T,
  requestId?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(requestId && { requestId }),
    timestamp: new Date().toISOString()
  }
}

// 验证认证信息
export async function validateAuth(token: string): Promise<void> {
  if (!token) {
    throw new NextJSUsageError(
      SERVER_ERROR_CODES.USER_UNAUTHORIZED,
      'No authentication token provided'
    )
  }

  // 这里可以添加更多的认证逻辑
  // 目前使用现有的认证系统
}

// App Router 错误处理包装器
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('API Error:', error)
      
      const request = args[0] as NextRequest
      const requestId = getRequestId(request)
      
      if (error instanceof NextJSUsageError) {
        const errorResponse = error.toErrorResponse(requestId)
        return NextResponse.json(errorResponse, { 
          status: error.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        })
      }

      // 处理其他类型的错误
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: SERVER_ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal server error'
        },
        requestId,
        timestamp: new Date().toISOString()
      }

      return NextResponse.json(errorResponse, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }
  }
}

// Pages Router 错误处理包装器
export function withPagesErrorHandling<T extends any[]>(
  handler: (req: NextApiRequest, res: NextApiResponse, ...args: T) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse, ...args: T): Promise<void> => {
    try {
      await handler(req, res, ...args)
    } catch (error) {
      console.error('API Error:', error)
      
      const requestId = getRequestId(req)
      
      // 设置CORS头
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      if (error instanceof NextJSUsageError) {
        const errorResponse = error.toErrorResponse(requestId)
        return res.status(error.status).json(errorResponse)
      }

      // 处理其他类型的错误
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: SERVER_ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal server error'
        },
        requestId,
        timestamp: new Date().toISOString()
      }

      return res.status(500).json(errorResponse)
    }
  }
}

// 创建带有详细信息的使用量错误
export function createUsageLimitError(
  type: 'premium' | 'fast',
  currentUsage: { used: number; limit: number; remaining: number }
): NextJSUsageError {
  const baseUrl = getBaseUrl()
  
  const errorCode = type === 'premium' 
    ? SERVER_ERROR_CODES.PREMIUM_LIMIT_EXCEEDED 
    : SERVER_ERROR_CODES.FAST_LIMIT_EXCEEDED

  const message = type === 'premium' 
    ? '高级模型使用次数已达上限' 
    : '基础模型使用次数已达上限'

  const details: ErrorDetails = {
    currentUsage,
    upgradeUrl: `${baseUrl}/pricing`,
    supportUrl: `${baseUrl}/contact`,
    canRetry: false
  }

  return new NextJSUsageError(errorCode, message, details)
}
