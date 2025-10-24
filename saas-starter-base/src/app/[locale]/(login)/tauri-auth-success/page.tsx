'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

function TauriAuthSuccessContent() {
  const searchParams = useSearchParams();
  const authUrl = searchParams.get('authUrl');

  useEffect(() => {
    if (authUrl) {
      // 自动打开 deep-link
      window.location.href = authUrl;
    }
  }, [authUrl]);

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        桌面端登录
      </h2>
      <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div className="flex flex-col items-center">
          <p className="mt-2 text-center text-sm text-gray-600">
            正在打开桌面端应用，请在弹出的 Tauri 客户端中完成登录。
          </p>
          {authUrl && (
            <a
              href={authUrl}
              className="mt-6 text-orange-600 hover:text-orange-800 underline break-all"
            >
              如果没有自动跳转，请点击这里手动打开桌面端
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TauriAuthSuccessPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <Suspense>
        <TauriAuthSuccessContent />
      </Suspense>
    </div>
  );
}