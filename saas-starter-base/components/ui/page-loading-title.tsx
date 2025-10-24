'use client';

import { useEffect } from 'react';

interface PageLoadingTitleProps {
  loadingTitle: string;
  finalTitle: string;
}

export function PageLoadingTitle({ loadingTitle, finalTitle }: PageLoadingTitleProps) {
  useEffect(() => {
    // 设置加载状态的标题
    document.title = `⏳ ${loadingTitle}`;
    
    // 页面加载完成后恢复正常标题
    const timer = setTimeout(() => {
      document.title = finalTitle;
    }, 500);

    return () => {
      clearTimeout(timer);
      document.title = finalTitle;
    };
  }, [loadingTitle, finalTitle]);

  return null;
}
