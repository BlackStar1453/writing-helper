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
        console.log('[OAuth Callback] 开始处理认证回调');
        console.log('[OAuth Callback] 当前URL:', window.location.href);
        console.log('[OAuth Callback] URL哈希:', window.location.hash);
        
        // 首先检查 URL 参数中是否有错误
        const errorParam = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorDescription = searchParams.get('error_description');

        console.log('[OAuth Callback] URL参数检查:', { errorParam, errorCode, errorDescription });

        if (errorParam) {
          console.error('[OAuth Callback] OAuth 错误:', { errorParam, errorCode, errorDescription });
          
          // 处理特定的错误类型
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
        const type = hashParams.get('type');

        console.log('[OAuth Callback] 哈希参数提取:', { 
          accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null, 
          refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null, 
          type 
        });

        // 检查哈希中是否也有错误
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

        console.log('[OAuth Callback] 处理认证回调:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

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
            console.log('[OAuth Callback] 用户元数据:', user.user_metadata);
            
            // 检查是否是 tauri-auth 登录
            const isTauriAuth = searchParams.get('tauriAuth') === '1';
            console.log('[OAuth Callback] 是否为Tauri认证:', isTauriAuth);
            
            // 提取用户姓名
            const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.user_metadata?.preferred_username || null;
            console.log('[OAuth Callback] 提取的用户姓名:', userName);
            
            // 调用后端API来同步用户数据并设置我们的session
            try {
              console.log('[OAuth Callback] 开始同步用户数据...');
              console.log('[OAuth Callback] 请求数据:', {
                userId: user.id,
                email: user.email,
                name: userName,
              });
              
              // 添加重试机制
              let retryCount = 0;
              const maxRetries = 3;
              let lastError = null;
              
              while (retryCount < maxRetries) {
                try {
                  console.log(`[OAuth Callback] 第 ${retryCount + 1} 次尝试同步用户数据...`);
                  
                  // 添加超时控制
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => {
                    console.log('[OAuth Callback] 请求超时，中止请求');
                    controller.abort();
                  }, 15000); // 增加到15秒超时
                  
                  // 详细记录请求信息
                  const requestHeaders = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                  };
                  
                  const requestBody = {
                    userId: user.id,
                    email: user.email,
                    name: userName,
                  };
                  
                  console.log('[OAuth Callback] 发送请求到:', '/api/auth/sync-user');
                  console.log('[OAuth Callback] 请求头:', requestHeaders);
                  console.log('[OAuth Callback] 请求体:', requestBody);
                  console.log('[OAuth Callback] Access Token (前50字符):', accessToken.substring(0, 50));
                  
                  const response = await fetch('/api/auth/sync-user', {
                    method: 'POST',
                    headers: requestHeaders,
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                  });

                  clearTimeout(timeoutId);
                  console.log('[OAuth Callback] 收到响应，状态:', response.status);
                  console.log('[OAuth Callback] 响应头:', Object.fromEntries(response.headers.entries()));
                  
                  if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[OAuth Callback] API响应错误:', {
                      status: response.status,
                      statusText: response.statusText,
                      body: errorText
                    });
                    
                    // 如果是认证错误，不要重试
                    if (response.status === 401) {
                      throw new Error(`认证失败: ${errorText}`);
                    }
                    
                    throw new Error(`API错误 ${response.status}: ${errorText}`);
                  }

                  const syncResult = await response.json();
                  console.log('[OAuth Callback] 用户数据同步成功:', syncResult);
                  
                  // 成功，跳出重试循环
                  break;
                  
                } catch (error) {
                  lastError = error;
                  console.error(`[OAuth Callback] 第 ${retryCount + 1} 次尝试失败:`, error);
                  
                  if (error instanceof Error) {
                    if (error.name === 'AbortError') {
                      console.error('[OAuth Callback] 请求超时');
                    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                      console.error('[OAuth Callback] 网络连接错误');
                    } else if (error.message.includes('认证失败')) {
                      console.error('[OAuth Callback] 认证错误，不重试');
                      throw error; // 认证错误不重试
                    } else {
                      console.error('[OAuth Callback] 其他错误:', error.message);
                    }
                  }
                  
                  retryCount++;
                  
                  // 如果还有重试机会，等待一下再重试
                  if (retryCount < maxRetries) {
                    const waitTime = 1000 * retryCount; // 递增等待时间
                    console.log(`[OAuth Callback] 等待 ${waitTime}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                  }
                }
              }
              
              // 如果所有重试都失败了
              if (retryCount >= maxRetries) {
                console.error('[OAuth Callback] 所有重试尝试都失败了');
                throw lastError || new Error('用户数据同步失败');
              }
              
            } catch (syncError) {
              console.error('[OAuth Callback] 同步用户数据时发生错误:', syncError);
              
              // 详细错误分析
              if (syncError instanceof Error) {
                if (syncError.name === 'AbortError') {
                  console.error('[OAuth Callback] 请求超时');
                  setError('用户数据同步超时，请重试或联系管理员');
                } else if (syncError instanceof TypeError && syncError.message.includes('fetch')) {
                  console.error('[OAuth Callback] 网络连接错误');
                  setError('网络连接失败，请检查网络连接后重试');
                } else if (syncError.message.includes('认证失败')) {
                  console.error('[OAuth Callback] 认证错误');
                  setError('用户认证失败，请重新登录');
                } else {
                  console.error('[OAuth Callback] 未知错误:', syncError.message);
                  setError('用户数据同步失败: ' + syncError.message);
                }
              } else {
                console.error('[OAuth Callback] 非Error类型错误:', syncError);
                setError('用户数据同步失败，请重试');
              }
              return;
            }

            // 根据登录场景进行不同的重定向处理
            console.log('[OAuth Callback] 开始处理重定向逻辑...');
            if (isTauriAuth) {
              try {
                // Tauri 登录场景：生成 deep-link
                console.log('[OAuth Callback] 处理 Tauri 认证，生成 deep-link');
                const deepLinkResponse = await fetch('/api/tauri-auth/initiate', { 
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                });
                const deepLinkData = await deepLinkResponse.json();
                
                if (deepLinkData.success && deepLinkData.authUrl) {
                  console.log('[OAuth Callback] Deep-link 生成成功，跳转到 tauri-auth-success');
                  router.push(`/tauri-auth-success?authUrl=${encodeURIComponent(deepLinkData.authUrl)}`);
                } else {
                  console.error('[OAuth Callback] Deep-link 生成失败:', deepLinkData.error);
                  setError('无法生成桌面端认证链接: ' + (deepLinkData.error || '未知错误'));
                }
              } catch (deepLinkError) {
                console.error('[OAuth Callback] 生成 deep-link 时发生错误:', deepLinkError);
                setError('生成桌面端认证链接时发生错误');
              }
            } else {
              // 普通登录场景：重定向到 dashboard
              console.log('[OAuth Callback] 普通登录场景，重定向到 dashboard');
              router.push('/dashboard');
            }
          } else {
            console.error('[OAuth Callback] 未能获取用户信息');
            setError('未能获取用户信息');
          }
        } else {
          console.error('[OAuth Callback] URL中缺少必要的认证参数:', { 
            accessToken: !!accessToken, 
            refreshToken: !!refreshToken,
            hash: window.location.hash 
          });
          setError('URL 中缺少必要的认证参数');
        }
      } catch (error) {
        console.error('[OAuth Callback] 处理认证回调时发生错误:', error);
        if (error instanceof Error) {
          console.error('[OAuth Callback] 错误堆栈:', error.stack);
        }
        setError('验证过程中发生错误');
      } finally {
        console.log('[OAuth Callback] 处理完成，设置 isLoading = false');
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