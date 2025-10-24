'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircleIcon, Loader2, Info } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';
import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { supabase } from '@/lib/supabase-client';

// 添加 Cloudflare Turnstile 类型声明
declare global {
  interface Window {
    turnstile: {
      render: (element: string | HTMLElement, options: {
        sitekey: string;
        callback?: (token: string) => void;
        'error-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
      }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

interface AuthProps {
  state: string | null;
  redirectUri?: string | null;
}
export function Login({
  mode = 'signin',
  extensionAuth,
  tauriAuth,
  onAuthSuccess
}: {
  mode?: 'signin' | 'signup';
  extensionAuth?: AuthProps;
  tauriAuth?: boolean;
  onAuthSuccess?: (result: any) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );
  const [isGitHubLoading, setIsGitHubLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('Auth');
  const tTauri = useTranslations('TauriAuth');

  useEffect(() => {
    if (mode === 'signup' && process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;

      // 设置全局回调函数
      (window as any).handleTurnstileCallback = (token: string) => {
        setTurnstileToken(token);
      };

      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
        delete (window as any).handleTurnstileCallback;
      };
    }
  }, [mode]);

  const handleSubmit = async (formData: FormData) => {
    if (mode === 'signup' && turnstileToken) {
      formData.append('turnstileToken', turnstileToken);
    }

    formAction(formData);
  };

  // GitHub 登录处理
  const handleGitHubLogin = async () => {
    try {
      setIsGitHubLoading(true);

      // 构建重定向 URL，在 tauri-auth 场景下添加标识参数
      const redirectTo = tauriAuth
        ? `${window.location.origin}/auth/callback?tauriAuth=1`
        : `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('GitHub 登录失败:', error);
        alert('GitHub 登录失败: ' + error.message);
      }
    } catch (error) {
      console.error('GitHub 登录错误:', error);
      alert('GitHub 登录发生错误');
    } finally {
      setIsGitHubLoading(false);
    }
  };

  // Google 登录处理
  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);

      // 构建重定向 URL，在 tauri-auth 场景下添加标识参数
      const redirectTo = tauriAuth
        ? `${window.location.origin}/auth/callback?tauriAuth=1`
        : `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('Google 登录失败:', error);
        alert('Google 登录失败: ' + error.message);
      }
    } catch (error) {
      console.error('Google 登录错误:', error);
      alert('Google 登录发生错误');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (state && state.success) {
      // 处理邮箱验证状态
      if (state.emailVerificationRequired) {
        router.push(`/email-verification?email=${encodeURIComponent(state.email || '')}`);
        return;
      }

      // 扩展认证处理 - 暂时注释掉
      // if (state.extensionAuth) {
      //   console.log('[扩展认证] 登录组件收到认证成功响应:', state.extensionAuth);

      //   if (onAuthSuccess) {
      //     onAuthSuccess(state);
      //   }

      //   const redirectUrl = state.extensionAuth.redirectUrl;
      //   if (redirectUrl) {
      //     console.log('[扩展认证] 客户端重定向到:', redirectUrl);
      //     window.location.href = redirectUrl;
      //   }
      //   return;
      // }
      if (state.tauriAuth) {
        (async () => {
          const res = await fetch('/api/tauri-auth/initiate', { method: 'POST' });
          const data = await res.json();
          if (data.success && data.authUrl) {
            window.location.href = `/tauri-auth-success?authUrl=${encodeURIComponent(data.authUrl)}`;
          } else {
            alert(data.error || '无法获取认证链接');
          }
        })();
        return;
      }
      if (onAuthSuccess) onAuthSuccess(state);
    }
  }, [state, onAuthSuccess, router]);

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {mode === 'signin'
            ? t('signInTitle')
            : t('signUpTitle')}
        </h2>
      </div>

      {tauriAuth && (
        <div className="mt-4 mx-auto max-w-md">
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-medium">{tTauri('tipTitle')}</div>
              <div className="text-blue-700">{tTauri('tipDescription')}</div>
            </div>
          </div>
        </div>
      )}


      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form className="space-y-6" action={handleSubmit}>
          <input type="hidden" name="redirect" value={redirect || ''} />
          <input type="hidden" name="priceId" value={priceId || ''} />
          <input type="hidden" name="inviteId" value={inviteId || ''} />
          {/* 扩展认证隐藏字段 - 暂时注释掉 */}
          {/* {extensionAuth && (
            <input type="hidden" name="extensionAuthState" value={extensionAuth.state || ''} />
          )}
          {extensionAuth && (
            <input type="hidden" name="extensionRedirectUri" value={extensionAuth.redirectUri || ''} />
          )} */}
          {tauriAuth && (
            <input type="hidden" name="tauriAuth" value="1" />
          )}
          <div>
            <Label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              {t('email')}
            </Label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                required
                maxLength={50}
                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder={t('emailPlaceholder')}
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              {t('password')}
            </Label>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                defaultValue={state.password}
                required
                minLength={8}
                maxLength={100}
                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder={t('passwordPlaceholder')}
              />
            </div>
          </div>

          {state?.error && (
            <div className="text-red-500 text-sm">{state.error}</div>
          )}

          {mode === 'signup' && process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY && (
            <div className="flex flex-col items-center space-y-2">
              <div
                ref={turnstileRef}
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY}
                data-callback="handleTurnstileCallback"
                data-theme="light"
                data-size="normal"
              />
              <div className="text-xs text-gray-500 text-center">
                {t('turnstileNotice')}
              </div>
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  {t('loading')}
                </>
              ) : mode === 'signin' ? (
                t('signIn')
              ) : (
                t('signUp')
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                {t('orLoginWith')}{mode === 'signin' ? '' : ''}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              onClick={handleGitHubLogin}
              disabled={isGitHubLoading || isGoogleLoading}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {isGitHubLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  {t('connectingGitHub')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  {mode === 'signin' ? t('githubSignIn') : t('githubSignUp')}
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isGitHubLoading}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  {t('connectingGoogle')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {mode === 'signin' ? t('googleSignIn') : t('googleSignUp')}
                </>
              )}
            </Button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">
                  {mode === 'signin'
                    ? t('noAccount')
                    : t('hasAccount')}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                  redirect ? `?redirect=${redirect}` : ''
                }${priceId ? `&priceId=${priceId}` : ''}`}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                {mode === 'signin'
                  ? t('createAccount')
                  : t('signInToAccount')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
