'use client';

import Image from 'next/image';
import { useSmartAssets } from '@/hooks/useSmartAssets';

interface SmartImageProps {
  assetPath: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 智能图片组件
 * 根据网络环境自动选择最优CDN
 */
export function SmartImage({
  assetPath,
  alt,
  width,
  height,
  className,
  priority = false,
  loading = 'lazy',
  onLoad,
  onError
}: SmartImageProps) {
  const { getImageUrl, isLoading } = useSmartAssets();

  // 如果还在加载网络检测，使用原始路径
  const finalSrc = isLoading ? assetPath : getImageUrl(assetPath);

  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      loading={loading}
      onLoad={onLoad}
      onError={onError}
      className={className}
    />
  );
}

/**
 * 智能GIF组件
 * 根据网络环境自动选择最优CDN
 */
export function SmartGif({
  assetPath,
  alt,
  width,
  height,
  className
}: {
  assetPath: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const { getGifUrl, isLoading, useOSS } = useSmartAssets();

  // 如果还在加载网络检测，使用原始路径
  const finalPath = isLoading ? assetPath : getGifUrl(assetPath);

  return (
    <img
      src={finalPath}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{
        maxWidth: '100%',
        height: 'auto'
      }}
      onLoad={() => {
        console.log(`✅ [SmartGif] GIF 加载成功:`);
      }}
      onError={() => {
        console.error(`❌ [SmartGif] GIF 加载失败:`, {
          originalPath: assetPath,
          finalPath: finalPath,
          useOSS: useOSS,
          source: useOSS ? 'OSS' : 'CDN',
          errorType: 'Image load failed'
        });
      }}
    />
  );
}
