'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Smartphone, CheckCircle, XCircle } from 'lucide-react';

// 声明全局变量类型
declare global {
  interface Window {
    authResult?: {
      success: boolean;
      userData: {
        id: string;
        name: string;
        email: string;
        authToken: string;
      };
      state: string;
      dashboardUrl?: string;
    };
  }
}

/**
 * 扩展认证成功页面的实际内容
 * 这是一个客户端组件，因为它需要使用 useSearchParams
 */
function ExtensionAuthSuccessContent() {
  // 浏览器扩展认证功能暂时注释掉
  const [status] = useState<'error'>('error');
  const [message] = useState('浏览器扩展认证功能暂时未启用');

  // const searchParams = useSearchParams();
  // const [status, setStatus] = useState<'success' | 'error' | 'loading'>('loading');
  // const [message, setMessage] = useState('正在处理认证结果...');

  // // 获取URL参数
  // const token = searchParams.get('token');
  // const userData = searchParams.get('user_data');
  // const state = searchParams.get('state');
  // const dashboardUrl = searchParams.get('dashboard_url');

  // useEffect(() => {
  //   let dashboardOpened = false;

  //   // 检查参数完整性
  //   if (!userData || !state) {
  //     setStatus('error');
  //     setMessage('认证数据不完整，请重新登录');
  //     return;
  //   }

  //   try {
  //     // 解析用户数据
  //     const userInfo = JSON.parse(decodeURIComponent(userData));

  //     // 设置全局变量，供浏览器扩展读取
  //     window.authResult = {
  //       success: true,
  //       userData: userInfo,
  //       state,
  //       dashboardUrl: dashboardUrl || undefined
  //     };

  //     // 触发自定义事件，便于浏览器扩展监听
  //     const authEvent = new CustomEvent('extension-auth-complete', {
  //       detail: { success: true, token, userData: userInfo, state, dashboardUrl: dashboardUrl || undefined }
  //     });
  //     window.dispatchEvent(authEvent);

  //     setStatus('success');
  //     setMessage('认证成功！正在跳转至系统...');

  //     // 在1秒后打开仪表板（给扩展足够时间处理数据）
  //     if (dashboardUrl) {
  //       setTimeout(() => {
  //         // 如果用户仍在此页面，则打开仪表板
  //         if (document.visibilityState === 'visible' && !dashboardOpened) {
  //           dashboardOpened = true;
  //           window.location.href = dashboardUrl;
  //         }
  //       }, 1000);
  //     }
  //   } catch (error) {
  //     console.error('处理认证数据失败:', error);
  //     setStatus('error');
  //     setMessage('处理认证数据时出错，请重新登录');
  //   }

  //   // 清理函数
  //   return () => {
  //     dashboardOpened = true; // 防止用户离开页面后仍然跳转
  //   };
  // }, [token, userData, state, dashboardUrl]);
  
  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="flex justify-center">
        <Smartphone className="h-12 w-12 text-orange-500" />
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
        浏览器扩展认证
      </h2>

      <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div className="flex flex-col items-center">
          {status === 'error' && (
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
          )}

          <p className="mt-2 text-center text-sm text-gray-600">
            {message}
          </p>

          {status === 'error' && (
            <button
              onClick={() => window.location.href = '/sign-in'}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              返回登录
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 扩展认证成功页面 - 页面入口
 * 此组件作为服务器组件，并使用 Suspense 来加载客户端组件
 */
export default function ExtensionAuthSuccessPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <ExtensionAuthSuccessContent />
      </Suspense>
    </div>
  );
} 