'use client';

import React, { useState, useEffect } from 'react';
import { NovelNav } from '@/components/novel/NovelNav';
import { Button } from '@/components/ui/button';
import { getSettings, saveSettings } from '@/lib/db-utils';
import type { AppSettings } from '@/lib/settings-utils';
import { DEFAULT_SETTINGS, AI_MODELS, LANGUAGE_OPTIONS, AI_PROVIDER_OPTIONS } from '@/lib/settings-utils';
import { toast } from 'sonner';

export default function AppSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await getSettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveSettings(settings);
      toast.success('设置已保存');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('保存设置失败');
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast.success('已重置为默认设置');
  };

  const handleProviderChange = (provider: AppSettings['aiProvider']) => {
    setSettings({
      ...settings,
      aiProvider: provider,
      aiModel: AI_MODELS[provider][0]
    });
  };

  if (loading) {
    return (
      <NovelNav>
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">加载中...</div>
        </div>
      </NovelNav>
    );
  }

  return (
    <NovelNav>
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-2xl font-light text-gray-900 dark:text-white mb-12">应用设置</h1>

        <div className="space-y-8">
          {/* 界面语言 */}
          <div className="space-y-3">
            <label className="block text-sm font-light text-gray-700 dark:text-gray-300">
              界面语言
            </label>
            <select
              value={settings.uiLanguage}
              onChange={(e) => setSettings({ ...settings, uiLanguage: e.target.value as 'zh' | 'en' })}
              className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 font-light"
            >
              {LANGUAGE_OPTIONS.ui.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 写作语言 */}
          <div className="space-y-3">
            <label className="block text-sm font-light text-gray-700 dark:text-gray-300">
              写作语言
            </label>
            <select
              value={settings.writingLanguage}
              onChange={(e) => setSettings({ ...settings, writingLanguage: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 font-light"
            >
              {LANGUAGE_OPTIONS.writing.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* AI 提供商 */}
          <div className="space-y-3">
            <label className="block text-sm font-light text-gray-700 dark:text-gray-300">
              AI 提供商
            </label>
            <select
              value={settings.aiProvider}
              onChange={(e) => handleProviderChange(e.target.value as AppSettings['aiProvider'])}
              className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 font-light"
            >
              {AI_PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* AI 模型 */}
          <div className="space-y-3">
            <label className="block text-sm font-light text-gray-700 dark:text-gray-300">
              AI 模型
            </label>
            <select
              value={settings.aiModel}
              onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
              className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 font-light"
            >
              {AI_MODELS[settings.aiProvider].map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* API Token */}
          <div className="space-y-3">
            <label className="block text-sm font-light text-gray-700 dark:text-gray-300">
              API Token
            </label>
            <input
              type="password"
              value={settings.apiToken}
              onChange={(e) => setSettings({ ...settings, apiToken: e.target.value })}
              placeholder="输入你的 API Token"
              className="w-full px-4 py-2 border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 font-light"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-light">
              API Token 将安全地存储在本地浏览器中
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-6">
            <Button
              onClick={handleSave}
              className="bg-gray-900 hover:bg-gray-800 text-white font-light"
            >
              保存设置
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-gray-200 hover:bg-gray-50 font-light"
            >
              重置为默认
            </Button>
          </div>
        </div>
      </div>
    </NovelNav>
  );
}

