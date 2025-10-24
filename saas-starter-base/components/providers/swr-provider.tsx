/**
 * SWR Provider 客户端组件
 * 处理SWR的全局配置，包括事件处理器
 */

'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
  fallback?: Record<string, any>;
}

export default function SWRProvider({ children, fallback = {} }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fallback,
        // 全局SWR配置
        revalidateOnFocus: false, // 不在窗口聚焦时重新验证
        revalidateOnReconnect: true, // 网络重连时重新验证
        revalidateIfStale: true, // 如果数据过期则重新验证
        dedupingInterval: 2000, // 2秒内的重复请求会被去重
        focusThrottleInterval: 5000, // 聚焦节流间隔5秒
        errorRetryCount: 3, // 错误重试次数
        errorRetryInterval: 5000, // 重试间隔5秒
        // 全局错误处理
        onError: (error, key) => {
          console.error(`[SWR] 请求失败 ${key}:`, error);
        },
        // 全局成功处理
        onSuccess: (data, key) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[SWR] 请求成功 ${key}`);
          }
        }
      }}
    >
      {children}
    </SWRConfig>
  );
}
