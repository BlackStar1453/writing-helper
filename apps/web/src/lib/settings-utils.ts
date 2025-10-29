/**
 * Settings types and utilities
 */

export interface AppSettings {
  // 界面语言
  uiLanguage: 'zh' | 'en';
  // 写作语言(用户打算学习的语言)
  writingLanguage: 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';
  // AI提供商
  aiProvider: 'openai' | 'anthropic' | 'google' | 'deepseek';
  // AI模型
  aiModel: string;
  // API Token
  apiToken: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  uiLanguage: 'zh',
  writingLanguage: 'en',
  aiProvider: 'deepseek',
  aiModel: 'deepseek-chat',
  apiToken: ''
};

// AI提供商和对应的模型列表
export const AI_MODELS: Record<AppSettings['aiProvider'], string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  deepseek: ['deepseek-chat', 'deepseek-coder']
};

// 语言选项
export const LANGUAGE_OPTIONS = {
  ui: [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' }
  ],
  writing: [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' }
  ]
};

// AI提供商选项
export const AI_PROVIDER_OPTIONS = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' }
];

