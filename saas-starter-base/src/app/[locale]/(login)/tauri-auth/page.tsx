'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Login } from '../login';
import { Skeleton } from '@/components/ui/skeleton';

export default function TauriAuthPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 登录成功后回调
  const handleAuthSuccess = async (result: any) => {
    setStatus('loading');
    setError(null);
    try {
      // 登录成功后，调用 tauri-auth/initiate 获取 deep-link
      const res = await fetch('/api/tauri-auth/initiate', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.authUrl) {
        router.push(`/tauri-auth-success?authUrl=${encodeURIComponent(data.authUrl)}`);
      } else {
        setStatus('error');
        setError(data.error || '无法获取认证链接');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e.message || '网络错误');
    }
  };

  return (
    <Suspense fallback={<AuthSkeleton />}>
      <Login mode="signin" onAuthSuccess={handleAuthSuccess} tauriAuth />
    </Suspense>
  );
}

function AuthSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <Skeleton className="h-8 w-3/4 mx-auto" />

        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}