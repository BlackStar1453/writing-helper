'use client';

import { useState, useEffect } from 'react';

interface UseAdminReturn {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * React Hook 用于检查当前用户是否为管理员
 * @returns {UseAdminReturn} 包含管理员状态、加载状态和错误信息
 */
export function useAdmin(): UseAdminReturn {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/user');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const user = await response.json();
        setIsAdmin(user?.role === 'admin');
        
      } catch (err) {
        console.error('检查管理员状态失败:', err);
        setError(err instanceof Error ? err.message : '检查管理员状态失败');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading, error };
}

/**
 * React Hook 用于检查管理员权限并提供重新检查功能
 * @returns {UseAdminReturn & { refetch: () => void }} 包含管理员状态和重新检查函数
 */
export function useAdminWithRefetch(): UseAdminReturn & { refetch: () => void } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user', {
        cache: 'no-store', // 确保获取最新数据
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const user = await response.json();
      setIsAdmin(user?.role === 'admin');
      
    } catch (err) {
      console.error('检查管理员状态失败:', err);
      setError(err instanceof Error ? err.message : '检查管理员状态失败');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  return { 
    isAdmin, 
    loading, 
    error, 
    refetch: checkAdminStatus 
  };
}
