'use client';

import { useState, useEffect } from 'react';
import { useNetworkDetection } from './useNetworkDetection';

type PlatformKey = "darwin-x86_64" | "darwin-aarch64" | "windows-x86_64"

export type LatestDownloadInfo = {
  version: string
  notes: string
  pub_date: string
  platforms: {
    [key in PlatformKey]?: {
      url: string
      signature?: string
    }
  }
}

/**
 * 智能预加载Hook
 * 根据网络环境选择合适的数据源
 */
export function useSmartPreload() {
  const { useOSS, isLoading: networkLoading } = useNetworkDetection();
  const [data, setData] = useState<LatestDownloadInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (networkLoading || useOSS === null) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 根据网络环境选择数据源
        const baseUrl = useOSS 
          ? 'https://elick-assets-china.oss-cn-beijing.aliyuncs.com'
          : 'https://assets.elick.it.com/cdn';
        
        const url = `${baseUrl}/downloads/latest.json`;
        
        console.log(`[智能预加载] 从 ${useOSS ? 'OSS' : 'CDN'} 加载数据: ${url}`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Elick-App/1.0',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10秒超时
        });

        if (!response.ok) {
          throw new Error(`API 响应错误: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // 验证数据格式
        if (!result.version || !result.platforms) {
          throw new Error('返回的数据格式不正确');
        }

        setData(result);
        console.log(`✅ 成功加载最新版本信息: ${result.version}`);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        setError(errorMessage);
        console.error('❌ 加载最新版本信息失败:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [useOSS, networkLoading]);

  return {
    data,
    isLoading,
    error,
    useOSS
  };
}
