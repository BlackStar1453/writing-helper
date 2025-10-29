/**
 * Cloudflare Worker: 域名路由器
 * 处理主域名的请求路由：
 * - /cdn/* 路径 → R2存储桶
 * - 其他路径 → Vercel网站
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 如果是CDN路径，代理到R2
    if (url.pathname.startsWith('/cdn/')) {
      return handleCDNRequest(request, env);
    }
    
    // 其他路径代理到Vercel主网站
    return handleMainSiteRequest(request, env);
  }
};

/**
 * 处理CDN请求 - 代理到R2存储桶
 */
async function handleCDNRequest(request, env) {
  const url = new URL(request.url);
  
  // 构建R2对象键（移除/cdn前缀）
  const objectKey = url.pathname.replace('/cdn/', '');
  
  try {
    // 从R2获取对象
    const object = await env.ELICK_ASSETS.get(objectKey);
    
    if (object === null) {
      return new Response('File not found', { 
        status: 404,
        headers: {
          'Cache-Control': 'public, max-age=300', // 5分钟缓存404
        }
      });
    }

    // 设置适当的Content-Type
    const contentType = getContentType(objectKey);
    
    // 设置缓存头
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1年缓存
    headers.set('ETag', object.etag);
    
    // 添加CORS头（如果需要）
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    
    // 检查If-None-Match头（ETag缓存）
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch === object.etag) {
      return new Response(null, { 
        status: 304,
        headers: headers
      });
    }

    return new Response(object.body, {
      headers: headers
    });

  } catch (error) {
    console.error('R2 access error:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
  }
}

/**
 * 处理主网站请求 - 代理到Vercel
 */
async function handleMainSiteRequest(request, env) {
  // 你的Vercel部署URL（需要替换为实际URL）
  const vercelUrl = env.VERCEL_URL || 'https://your-project.vercel.app';
  
  // 构建代理URL
  const url = new URL(request.url);
  const proxyUrl = new URL(url.pathname + url.search, vercelUrl);
  
  // 创建新的请求
  const modifiedRequest = new Request(proxyUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  
  // 添加原始Host头
  modifiedRequest.headers.set('X-Forwarded-Host', url.hostname);
  modifiedRequest.headers.set('X-Forwarded-Proto', url.protocol.slice(0, -1));
  
  try {
    // 代理请求到Vercel
    const response = await fetch(modifiedRequest);
    
    // 创建新的响应，保持原始头部
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    // 添加缓存控制（根据内容类型）
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
      modifiedResponse.headers.set('Cache-Control', 'public, max-age=86400'); // 1天
    } else {
      modifiedResponse.headers.set('Cache-Control', 'public, max-age=300'); // 5分钟
    }
    
    return modifiedResponse;

  } catch (error) {
    console.error('Vercel proxy error:', error);
    return new Response('Service Temporarily Unavailable', { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache',
        'Retry-After': '60'
      }
    });
  }
}

/**
 * 根据文件扩展名获取Content-Type
 */
function getContentType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes = {
    // 图片
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    
    // 文档
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json',
    
    // 压缩文件
    'zip': 'application/zip',
    'exe': 'application/octet-stream',
    'dmg': 'application/octet-stream',
    'deb': 'application/octet-stream',
    'rpm': 'application/octet-stream',
    
    // Web资源
    'css': 'text/css',
    'js': 'application/javascript',
    'html': 'text/html',
    
    // 字体
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}
