'use client';

import { useState, useEffect } from 'react';
import { getDynamicDownloadConfig } from '@/lib/config/downloads';
import { useNetworkDetection } from './useNetworkDetection';

/**
 * 智能下载Hook - 最简单的实现
 * 根据网络检测结果自动选择最优下载源
 */
export function useSmartDownload(version: string = 'v1.0.3') {
  const { useOSS, isLoading: networkLoading } = useNetworkDetection();
  const [config, setConfig] = useState<ReturnType<typeof getDynamicDownloadConfig> | null>(null);

  useEffect(() => {
    if (!networkLoading && useOSS !== null) {
      // 网络检测完成后，生成对应的下载配置
      const downloadConfig = getDynamicDownloadConfig(version, useOSS);
      setConfig(downloadConfig);
    }
  }, [version, useOSS, networkLoading]);

  return {
    config,
    isLoading: networkLoading || config === null,
    useOSS
  };
}
