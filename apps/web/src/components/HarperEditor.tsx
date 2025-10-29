'use client';

import { useEffect, useState } from 'react';
import { AgentModal } from './AgentModal';
import { SettingsModal } from './SettingsModal';
import type { AppSettings } from '../lib/settings-utils';
import { DEFAULT_SETTINGS } from '../lib/settings-utils';
import { getSettings, saveSettings } from '../lib/db-utils';

// Tutorial text with intentional errors (plain text, no markdown)
// Contains various error types: spelling, grammar, punctuation, word choice
const TUTORIAL_TEXT_EN = `Welcome to AI Writing Assistant! This tool help you write more better.

First, type or edit your text in the editor. When your ready, click the "Analyze" button to get AI-powered sugestions. The AI will automaticaly detect grammer errors and suggest improvements.

You can select any text to get quick improvements - make it more formal casual, or ask for better word choices.

When your done, click Save to store your writting history. Now try editing this text or clear it to start your own writting!`;

const TUTORIAL_TEXT_ZH = TUTORIAL_TEXT_EN; // Always use English tutorial

export default function HarperEditor() {
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [agentInitialMessage, setAgentInitialMessage] = useState('');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showTutorial, setShowTutorial] = useState(true);

  // 检查是否首次访问
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (hasSeenTutorial === 'true') {
      setShowTutorial(false);
    } else {
      // 首次访问,自动打开WritingModal
      setIsAgentModalOpen(true);
      setAgentInitialMessage('[OPEN_WRITING_MODAL]');
    }
  }, []);

  // 加载设置
  useEffect(() => {
    getSettings().then(savedSettings => {
      if (savedSettings) {
        setSettings(savedSettings);
      }
    }).catch(e => {
      console.error('Failed to load settings:', e);
    });
  }, []);

  // 保存设置
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings).catch(e => {
      console.error('Failed to save settings:', e);
    });
  };

  return (
    <>
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 relative">
        {/* Settings Button - Top Right */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="absolute top-6 right-6 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          title={settings.uiLanguage === 'zh' ? '设置' : 'Settings'}
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <div className="text-center space-y-6 p-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {settings.uiLanguage === 'zh' ? '写作助手' : 'Writing Assistant'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {settings.uiLanguage === 'zh' ? 'AI驱动的语法和风格建议' : 'AI-powered grammar and style suggestions'}
            </p>
          </div>

          {/* Start Writing Button */}
          <button
            onClick={() => {
              setIsAgentModalOpen(true);
              setAgentInitialMessage('[OPEN_WRITING_MODAL]');
            }}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all transform hover:scale-105 font-semibold text-lg shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {settings.uiLanguage === 'zh' ? '开始写作' : 'Start Writing'}
          </button>
        </div>
      </div>

      {/* Agent Modal */}
      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        text={''}
        errors={[]}
        initialMessage={agentInitialMessage}
        apiToken={settings.apiToken}
        aiProvider={settings.aiProvider}
        aiModel={settings.aiModel}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        tutorialText={settings.uiLanguage === 'zh' ? TUTORIAL_TEXT_ZH : TUTORIAL_TEXT_EN}
        showTutorial={showTutorial}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </>
  );
}
