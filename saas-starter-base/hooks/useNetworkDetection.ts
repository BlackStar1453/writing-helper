'use client';

import { useState, useEffect } from 'react';


/**
 * 简单的网络检测Hook
 * 自动检测用户网络环境，选择最优下载源
 */
export function useNetworkDetection() {

  const [isChina, setIsChina] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    // 如果启用检测，执行原有的检测逻辑
    const detectNetwork = async () => {
      try {
        setIsLoading(true);

        // 尝试访问OpenAI API来检测网络环境
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-store'
        });

        clearTimeout(timeoutId);

        // 如果能访问，说明是海外用户
        setIsChina(false);
        console.log('[NETWORK_DETECTION] 检测结果: 海外用户，使用CDN');

      } catch (error) {
        // 如果无法访问，说明是中国大陆用户
        setIsChina(true);
        console.log('[NETWORK_DETECTION] 检测结果: 中国大陆用户，使用OSS');
      } finally {
        setIsLoading(false);
      }
    };

    detectNetwork();
  }, []);

  return {
    isChina,
    isLoading,
    useOSS: isChina === true // 中国大陆用户使用OSS
  };
}
