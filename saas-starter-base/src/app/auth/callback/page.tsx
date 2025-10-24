'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[OAuth Callback] 开始处理认证回调（简化版）');
        console.log('[OAuth Callback] 当前URL:', window.location.href);
        
        // 检查 URL 参数中是否有错误
        const errorParam = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          console.error('[OAuth Callback] OAuth 错误:', { errorParam, errorCode, errorDescription });
          
          if (errorCode === 'unexpected_failure' && errorDescription?.includes('Multiple accounts')) {
            setError('检测到相同邮箱的多个账户。请联系管理员或尝试使用其他登录方式。');
            return;
          }
          
          setError(`登录失败: ${errorDescription || errorParam}`);
          return;
        }

        // 从 URL 哈希中获取认证信息
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        // 检查哈希中是否有错误
        const hashError = hashParams.get('error');
        if (hashError) {
          const hashErrorDescription = hashParams.get('error_description');
          console.error('[OAuth Callback] OAuth 哈希错误:', { hashError, hashErrorDescription });
          
          if (hashError === 'server_error' && hashErrorDescription?.includes('Multiple accounts')) {
            setError('检测到相同邮箱的多个账户。请尝试以下解决方案：\n1. 使用邮箱密码登录\n2. 联系管理员处理账户合并');
            return;
          }
          
          setError(`登录失败: ${hashErrorDescription || hashError}`);
          return;
        }

        if (accessToken && refreshToken) {
          console.log('[OAuth Callback] 开始设置 Supabase 会话...');
          
          // 设置 Supabase 会话
          const { data: { user }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[OAuth Callback] 设置会话失败:', sessionError);
            setError('验证失败: ' + sessionError.message);
            return;
          }

          if (user) {
            console.log('[OAuth Callback] 用户验证成功:', user);
            
            // 检查是否是 tauri-auth 登录
            const isTauriAuth = searchParams.get('tauriAuth') === '1';
            
            if (isTauriAuth) {
              // 桌面端场景同样先进入设置密码流程，页面内有“已设密码自动跳过”的早期检查
              console.log('[OAuth Callback] 检测到 Tauri 场景，跳转到密码设置页面');
              router.push('/set-password');
            } else {
              // 检查是否是邮箱验证后的跳转
              const callbackType = searchParams.get('type');
              const userEmail = searchParams.get('email');
              
              if (callbackType === 'signup' && userEmail) {
                console.log('[OAuth Callback] 检测到邮箱验证后的注册跳转');
                
                // 设置应用session（简化版，因为是新用户）
                try {
                  console.log('[OAuth Callback] 为新注册用户设置session...');
                  
                  const sessionResponse = await fetch('/api/auth/set-session', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                      userId: user.id,
                    }),
                  });

                  if (sessionResponse.ok) {
                    console.log('[OAuth Callback] Session设置成功，第三方登录用户需要设置密码');

                    // 所有第三方登录用户都需要设置密码
                    console.log('[OAuth Callback] 跳转到密码设置页面');
                    router.push(`/set-password?email=${encodeURIComponent(userEmail)}`);
                    return;
                  } else {
                    console.error('[OAuth Callback] Session设置失败，仍跳转到密码设置页面');
                    router.push(`/set-password?email=${encodeURIComponent(userEmail)}`);
                    return;
                  }
                } catch (error) {
                  console.error('[OAuth Callback] Session设置出错，仍跳转到密码设置页面:', error);
                  router.push(`/set-password?email=${encodeURIComponent(userEmail)}`);
                  return;
                }
              }
              
              // 普通登录场景：等待片刻让触发器完成，然后重定向到 dashboard
              console.log('[OAuth Callback] 普通登录场景，等待触发器完成用户创建...');
              
              // 设置应用session
              try {
                console.log('[OAuth Callback] 开始设置应用session...');
                
                // 添加重试机制，因为触发器可能需要时间
                let sessionRetryCount = 0;
                const maxSessionRetries = 5;
                let sessionSuccess = false;
                
                while (sessionRetryCount < maxSessionRetries && !sessionSuccess) {
                  try {
                    console.log(`[OAuth Callback] 第 ${sessionRetryCount + 1} 次尝试设置session...`);
                    
                    const sessionResponse = await fetch('/api/auth/set-session', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                      },
                      body: JSON.stringify({
                        userId: user.id,
                      }),
                    });

                    if (sessionResponse.ok) {
                      const sessionResult = await sessionResponse.json();
                      console.log('[OAuth Callback] 应用session设置成功:', sessionResult);
                      sessionSuccess = true;
                    } else if (sessionResponse.status === 404) {
                      // 用户记录还未创建，等待后重试
                      console.log('[OAuth Callback] 用户记录尚未创建，等待重试...');
                      sessionRetryCount++;
                      if (sessionRetryCount < maxSessionRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * sessionRetryCount));
                      }
                    } else {
                      const errorText = await sessionResponse.text();
                      console.error('[OAuth Callback] 设置session失败:', errorText);
                      throw new Error(`Session设置失败: ${errorText}`);
                    }
                  } catch (fetchError) {
                    console.error(`[OAuth Callback] Session设置尝试 ${sessionRetryCount + 1} 失败:`, fetchError);
                    sessionRetryCount++;
                    if (sessionRetryCount < maxSessionRetries) {
                      await new Promise(resolve => setTimeout(resolve, 1000 * sessionRetryCount));
                    } else {
                      throw fetchError;
                    }
                  }
                }
                
                if (!sessionSuccess) {
                  throw new Error('所有session设置尝试都失败了');
                }
                
              } catch (sessionError) {
                console.error('[OAuth Callback] 设置session时发生错误:', sessionError);
                setError('设置用户会话时发生错误，请重试');
                return;
              }
              
              // 对于普通登录场景，第三方登录用户需要设置密码
              console.log('[OAuth Callback] 第三方登录用户，跳转到密码设置页面');
              router.push('/set-password');
            }
          } else {
            console.error('[OAuth Callback] 未能获取用户信息');
            setError('未能获取用户信息');
          }
        } else {
          console.error('[OAuth Callback] URL中缺少必要的认证参数');
          setError('URL 中缺少必要的认证参数');
        }
      } catch (error) {
        console.error('[OAuth Callback] 处理认证回调时发生错误:', error);
        setError('验证过程中发生错误');
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">正在验证您的账户...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4 text-4xl">❌</div>
          <h1 className="text-xl font-semibold mb-4">登录失败</h1>
          <div className="text-gray-600 mb-6 whitespace-pre-line">{error}</div>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/sign-in')}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              使用邮箱密码登录
            </button>
            <button
              onClick={() => router.push('/sign-up')}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              返回注册页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-green-500 mb-4 text-4xl">✅</div>
        <h1 className="text-xl font-semibold mb-2">验证成功</h1>
        <p className="text-gray-600">正在跳转到控制台...</p>
      </div>
    </div>
  );
} 