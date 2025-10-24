'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('SubscriptionSuccess');
  const [syncUrl, setSyncUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const planName = searchParams.get('plan') || t('planActivated').replace('{planName}', '');
  const isBooster = searchParams.get('type') === 'booster';

  useEffect(() => {
    const generateSyncLink = async () => {
      try {
        setIsGenerating(true);
        
        // 调用同步API生成深度链接
        const response = await fetch('/api/tauri-auth/sync-user', {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.syncUrl) {
          setSyncUrl(result.syncUrl);
          console.log('[SubscriptionSuccess] 同步链接生成成功');
          
          // 自动打开深度链接（延迟2秒让用户看到成功信息）
          setTimeout(() => {
            window.location.href = result.syncUrl;
          }, 2000);
        } else {
          throw new Error(result.error || '生成同步链接失败');
        }
      } catch (err) {
        console.error('[SubscriptionSuccess] 生成同步链接失败:', err);
        setError(err instanceof Error ? err.message : '生成同步链接失败');
      } finally {
        setIsGenerating(false);
      }
    };

    generateSyncLink();
  }, []);

  const handleManualSync = () => {
    if (syncUrl) {
      window.location.href = syncUrl;
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isBooster ? t('boosterTitle') : t('title')}
        </h2>
        
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center space-y-6">
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isBooster ? t('boosterAdded') : t('planActivated', { planName })}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {t('syncingStatus')}
              </p>
            </div>

            {isGenerating && (
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <p className="text-sm text-gray-500">{t('generatingLink')}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">
                  {t('syncFailed', { error })}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {t('syncFailedRetry')}
                </p>
              </div>
            )}

            {syncUrl && !isGenerating && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-sm text-green-600 mb-3">
                    {t('linkGenerated')}
                  </p>

                  <Button
                    onClick={handleManualSync}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('manualSync')}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  {t('autoOpeningApp')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
