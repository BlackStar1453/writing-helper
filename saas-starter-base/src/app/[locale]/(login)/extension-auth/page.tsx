'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Login } from '../login';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

function ExtensionAuthContent() {
  // 浏览器扩展认证功能暂时注释掉
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">功能暂时不可用</h2>
          <p className="text-gray-600">浏览器扩展认证功能暂时未启用，请稍后再试。</p>
        </div>
      </div>
    </div>
  );

  // const searchParams = useSearchParams();
  // const state = searchParams.get('state');
  // const redirectUri = searchParams.get('redirect_uri');

  // if (!state) {
  //   return (
  //     <div className="fixed top-16 left-0 right-0 mx-auto max-w-md">
  //       <Alert variant="destructive">
  //         <AlertCircle className="h-4 w-4" />
  //         <AlertTitle>认证错误</AlertTitle>
  //         <AlertDescription>缺少必要的认证参数，请重试。</AlertDescription>
  //       </Alert>
  //     </div>
  //   );
  // }

  // return (
  //   <>
  //     <div className="fixed top-4 left-0 right-0 bg-orange-500 text-white py-2 px-4 text-center">
  //       <p>您正在为浏览器扩展授权登录</p>
  //     </div>
  //     <Login
  //       mode="signin"
  //       extensionAuth={{ state, redirectUri }}
  //     />
  //   </>
  // );
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

export default function ExtensionAuthPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <ExtensionAuthContent />
    </Suspense>
  );
}