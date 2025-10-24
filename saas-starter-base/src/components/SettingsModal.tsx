'use client';

import { useState, useEffect } from 'react';
import type { AppSettings } from '../lib/settings-utils';
import { DEFAULT_SETTINGS, AI_MODELS, LANGUAGE_OPTIONS, AI_PROVIDER_OPTIONS } from '../lib/settings-utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
  };

  const handleProviderChange = (provider: AppSettings['aiProvider']) => {
    setLocalSettings({
      ...localSettings,
      aiProvider: provider,
      aiModel: AI_MODELS[provider][0] // 选择该提供商的第一个模型
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {localSettings.uiLanguage === 'zh' ? '设置' : 'Settings'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* UI Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {localSettings.uiLanguage === 'zh' ? '界面语言' : 'UI Language'}
            </label>
            <select
              value={localSettings.uiLanguage}
              onChange={(e) => setLocalSettings({ ...localSettings, uiLanguage: e.target.value as 'zh' | 'en' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {LANGUAGE_OPTIONS.ui.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Writing Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {localSettings.uiLanguage === 'zh' ? '写作语言 (学习目标)' : 'Writing Language (Learning Target)'}
            </label>
            <select
              value={localSettings.writingLanguage}
              onChange={(e) => setLocalSettings({ ...localSettings, writingLanguage: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {LANGUAGE_OPTIONS.writing.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {localSettings.uiLanguage === 'zh' 
                ? '选择你想要学习和练习的语言' 
                : 'Select the language you want to learn and practice'}
            </p>
          </div>

          {/* AI Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {localSettings.uiLanguage === 'zh' ? 'AI 提供商' : 'AI Provider'}
            </label>
            <select
              value={localSettings.aiProvider}
              onChange={(e) => handleProviderChange(e.target.value as AppSettings['aiProvider'])}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {AI_PROVIDER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* AI Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {localSettings.uiLanguage === 'zh' ? 'AI 模型' : 'AI Model'}
            </label>
            <select
              value={localSettings.aiModel}
              onChange={(e) => setLocalSettings({ ...localSettings, aiModel: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {AI_MODELS[localSettings.aiProvider].map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* API Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {localSettings.uiLanguage === 'zh' ? 'API Token' : 'API Token'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="password"
              value={localSettings.apiToken || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, apiToken: e.target.value })}
              placeholder={localSettings.uiLanguage === 'zh' ? '请输入您的 API Token' : 'Enter your API Token'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              {localSettings.uiLanguage === 'zh'
                ? '请输入您的 API Token 以使用 AI 功能'
                : 'Enter your API Token to use AI features'}
            </p>
            {!localSettings.apiToken && (
              <p className="mt-1 text-sm text-red-500">
                {localSettings.uiLanguage === 'zh'
                  ? '⚠️ 未设置 API Token，AI 功能将无法使用'
                  : '⚠️ API Token not set, AI features will not work'}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            {localSettings.uiLanguage === 'zh' ? '恢复默认' : 'Reset to Default'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {localSettings.uiLanguage === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {localSettings.uiLanguage === 'zh' ? '保存' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

