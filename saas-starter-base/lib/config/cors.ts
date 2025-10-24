/**
 * 客户端友好的CORS配置
 * 平衡安全性和可用性
 */

/**
 * 获取客户端友好的CORS头
 * 对于需要客户端访问的API，使用相对宽松但仍然安全的配置
 */
export function getClientFriendlyCorsHeaders(): Record<string, string> {
  // 在开发环境使用通配符，生产环境使用配置的域名
  const allowOrigin = process.env.NODE_ENV === 'development'
    ? '*'
    : process.env.ALLOWED_ORIGINS || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, sentry-trace, baggage',
    'Access-Control-Allow-Credentials': 'false', // 不使用通配符时可以设为true
    'Access-Control-Max-Age': '86400', // 24小时
  };
}

/**
 * 获取需要认证的API的CORS头
 * 这些API需要更严格的安全控制
 */
export function getAuthenticatedCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  // 对于认证API，如果配置了具体域名则使用，否则回退到客户端友好模式
  const allowedOrigins = process.env.ALLOWED_ORIGINS;

  if (allowedOrigins && requestOrigin) {
    const origins = allowedOrigins.split(',').map(origin => origin.trim());
    const allowOrigin = origins.includes(requestOrigin) ? requestOrigin : origins[0];

    return {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, sentry-trace, baggage',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  }

  // 回退到客户端友好模式，但允许凭据
  return {
    'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : (process.env.ALLOWED_ORIGINS || '*'),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, sentry-trace, baggage',
    'Access-Control-Allow-Credentials': process.env.ALLOWED_ORIGINS ? 'true' : 'false',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * 处理OPTIONS预检请求
 */
export function handleCorsOptions(_request: Request): Response {
  const corsHeaders = getClientFriendlyCorsHeaders();

  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
