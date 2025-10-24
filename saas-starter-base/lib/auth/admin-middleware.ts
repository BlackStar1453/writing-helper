import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

/**
 * 检查当前用户是否为管理员
 */
export async function checkAdminRole(): Promise<boolean> {
  try {
    const user = await getUser();
    return user?.role === 'admin';
  } catch (error) {
    console.error('检查管理员权限失败:', error);
    return false;
  }
}

/**
 * 确保当前用户为管理员，否则重定向
 */
export async function requireAdmin(): Promise<void> {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }
}

/**
 * 获取当前用户并检查管理员权限
 */
export async function getAdminUser() {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  if (user.role !== 'admin') {
    redirect('/dashboard');
  }
  
  return user;
}

/**
 * 包装函数，确保只有管理员可以执行
 */
export function withAdminAuth<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    await requireAdmin();
    return fn(...args);
  };
}

/**
 * 用于API路由的管理员权限检查
 */
export async function verifyAdminAPI() {
  const user = await getUser();
  
  if (!user) {
    return { 
      success: false, 
      error: '未登录', 
      status: 401 
    };
  }
  
  if (user.role !== 'admin') {
    return { 
      success: false, 
      error: '权限不足，需要管理员权限', 
      status: 403 
    };
  }
  
  return { 
    success: true, 
    user 
  };
}
