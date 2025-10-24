'use client';

import { useState, useEffect } from 'react';
import { useNetworkDetection } from './useNetworkDetection';

/**
 * 智能资源配置Hook
 * 根据网络环境自动选择最优的CDN
 */
export function useSmartAssets() {
  const { useOSS, isLoading: networkLoading } = useNetworkDetection();
  const [baseUrl, setBaseUrl] = useState<string>('');

  useEffect(() => {
    if (!networkLoading && useOSS !== null) {
      if (useOSS) {
        // 中国大陆用户使用阿里云OSS
        const ossEndpoint = process.env.NEXT_PUBLIC_ALIYUN_OSS_ENDPOINT || 'https://elick-assets-china.oss-cn-beijing.aliyuncs.com';
        setBaseUrl(ossEndpoint);
        console.log('[智能资源] 使用阿里云OSS作为资源CDN');
      } else {
        // 海外用户使用Cloudflare CDN
        const cdnUrl = process.env.NEXT_PUBLIC_ASSETS_CDN_URL || 'https://assets.elick.it.com/cdn';
        setBaseUrl(cdnUrl);
        console.log('[智能资源] 使用Cloudflare CDN作为资源CDN');
      }
    }
  }, [useOSS, networkLoading]);

  /**
   * 获取图片URL
   */
  const getImageUrl = (path: string): string => {
    if (!baseUrl) return path; // 加载中时返回原路径
    return `${baseUrl}${path}`;
  };

  /**
   * 获取GIF URL
   */
  const getGifUrl = (path: string): string => {
    if (!baseUrl) return path; // 加载中时返回原路径
    return `${baseUrl}${path}`;
  };

  /**
   * 获取多语言GIF URL
   */
  const getLocalizedGifUrl = (gifName: string, locale: string = 'zh'): string => {
    const gifPath = `/gifs/${gifName}-${locale}.gif`;
    return getGifUrl(gifPath);
  };

  /**
   * 获取模板文件URL
   */
  const getTemplateUrl = (templateName: string, locale: string = 'zh'): string => {
    if (templateName === 'actions-example') {
      const templatePath = `/templates/actions-example-${locale}.json`;
      return getImageUrl(templatePath);
    }
    
    const templatePath = `/templates/${templateName}-${locale}.json`;
    return getImageUrl(templatePath);
  };

  /**
   * 获取任意资源URL
   */
  const getAssetUrl = (path: string): string => {
    if (!baseUrl) return path; // 加载中时返回原路径
    return `${baseUrl}${path}`;
  };

  return {
    baseUrl,
    isLoading: networkLoading || !baseUrl,
    useOSS,
    getImageUrl,
    getGifUrl,
    getLocalizedGifUrl,
    getTemplateUrl,
    getAssetUrl
  };
}
