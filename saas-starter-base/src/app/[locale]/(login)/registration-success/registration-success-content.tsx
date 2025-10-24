'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Mail, Monitor, ArrowRight, HelpCircle, Smartphone, Computer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function RegistrationSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';
  const t = useTranslations('RegistrationSuccess');
  const [isLoading, setIsLoading] = useState<{ tauri: boolean; extension: boolean }>({
    tauri: false,
    extension: false,
  });

  // 处理桌面客户端登录
  const handleTauriLogin = () => {
    setIsLoading(prev => ({ ...prev, tauri: true }));
    router.push('/tauri-auth');
  };

  // 处理浏览器扩展登录 - 暂时注释掉
  // const handleExtensionLogin = () => {
  //   setIsLoading(prev => ({ ...prev, extension: true }));
  //   // 生成一个临时的state和redirectUri用于演示
  //   const state = `temp_${Date.now()}`;
  //   const redirectUri = `${window.location.origin}/extension-auth-success`;
  //   router.push(`/extension-auth?state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`);
  // };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t('title')}
        </h2>
        
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('subtitle')}
        </p>
        
        <div className="mt-8 space-y-6">

          {/* 快速登录 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('quickLoginTitle')}</CardTitle>
              <CardDescription>
                {t('quickLoginDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={handleTauriLogin}
                  disabled={isLoading.tauri}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading.tauri ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      <Computer className="h-4 w-4" />
                      {t('tauriLoginButton')}
                    </>
                  )}
                </Button>
                {/* 浏览器扩展登录按钮 - 暂时注释掉 */}
                {/* <Button
                  onClick={handleExtensionLogin}
                  disabled={isLoading.extension}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isLoading.extension ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4" />
                      {t('extensionLoginButton')}
                    </>
                  )}
                </Button> */}
              </div>
            </CardContent>
          </Card>



          {/* 返回首页 */}
          <div className="text-center">
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-500 underline"
            >
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 