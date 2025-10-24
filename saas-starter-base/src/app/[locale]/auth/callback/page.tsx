'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LocaleAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到非locale版本的回调页面，保持所有URL参数和哈希
    const currentUrl = window.location.href;
    const newUrl = currentUrl.replace(/\/(zh|en)\/auth\/callback/, '/auth/callback');
    
    console.log('Redirecting from locale callback to main callback:', { from: currentUrl, to: newUrl });
    window.location.replace(newUrl);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">正在处理认证回调...</p>
      </div>
    </div>
  );
} 