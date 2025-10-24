import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

/**
 * 检查当前用户是否为管理员
 * @returns Promise<boolean> - 如果是管理员返回true，否则返回false
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getUser();
    return user?.role === 'admin';
  } catch (error) {
    console.error('检查管理员权限时发生错误:', error);
    return false;
  }
}

/**
 * 要求管理员权限，如果不是管理员则重定向
 * @param redirectTo - 重定向的路径，默认为 '/dashboard'
 */
export async function requireAdmin(redirectTo: string = '/dashboard'): Promise<void> {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  if (user.role !== 'admin') {
    redirect(redirectTo);
  }
}

/**
 * 获取当前用户并验证管理员权限
 * @returns Promise<User> - 返回管理员用户对象
 * @throws 如果不是管理员则抛出错误
 */
export async function getAdminUser() {
  const user = await getUser();
  
  if (!user) {
    throw new Error('用户未登录');
  }
  
  if (user.role !== 'admin') {
    throw new Error('权限不足：需要管理员权限');
  }
  
  return user;
}

/**
 * 管理员权限中间件，用于API路由
 * @param request - Next.js请求对象
 * @returns Promise<User | Response> - 返回管理员用户对象或错误响应
 */
export async function adminMiddleware(request?: Request) {
  try {
    const user = await getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: 用户未登录' }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (user.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: 需要管理员权限' }), 
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return user;
  } catch (error) {
    console.error('管理员权限验证失败:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error: 权限验证失败' }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
