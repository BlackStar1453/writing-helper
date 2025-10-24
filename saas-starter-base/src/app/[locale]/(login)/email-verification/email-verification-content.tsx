'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function EmailVerificationContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      // 这里可以调用重发邮件的API
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      alert('验证邮件已重新发送！');
    } catch (error) {
      alert('重发邮件失败，请稍后重试。');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          验证您的邮箱地址
        </h2>
        
        <p className="mt-2 text-center text-sm text-gray-600">
          我们已向您的邮箱发送了验证链接
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                验证邮件已发送至：
              </p>
              <p className="font-semibold text-gray-900 break-all">
                {email}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="text-sm text-blue-800">
                <p className="mb-2">📧 请检查您的邮箱</p>
                <p className="mb-2">点击邮件中的验证链接来激活您的账户</p>
                <p className="text-xs text-blue-600">
                  如果没有收到邮件，请检查垃圾邮件文件夹
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="animate-spin mr-2 h-4 w-4" />
                    重新发送中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新发送验证邮件
                  </>
                )}
              </Button>

              <Link
                href="/sign-in"
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回登录页面
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-center text-xs text-gray-500">
            <p>验证邮件有效期为24小时</p>
            <p>如有疑问，请联系客服支持</p>
          </div>
        </div>
      </div>
    </div>
  );
} 