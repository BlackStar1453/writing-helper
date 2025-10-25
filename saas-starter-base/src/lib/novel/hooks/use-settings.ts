/**
 * 设定卡片Hook
 */

import { useState, useEffect } from 'react';
import { SettingCard } from '../types';
import { getStorageAdapter } from '../platform-utils';

export function useSettings(novelId: string | null) {
  const [settings, setSettings] = useState<SettingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载设定列表
  const loadSettings = async () => {
    if (!novelId) {
      setSettings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const storage = await getStorageAdapter();
      const allSettings = await storage.list('settings');
      const filteredSettings = allSettings
        .filter((setting: SettingCard) => setting.novelId === novelId);
      setSettings(filteredSettings);
      setError(null);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [novelId]);

  // 创建设定
  const createSetting = async (data: Partial<SettingCard>) => {
    if (!novelId) {
      throw new Error('No novel selected');
    }

    const storage = await getStorageAdapter();
    const newSetting: Omit<SettingCard, 'id' | 'createdAt' | 'updatedAt'> = {
      novelId,
      name: data.name || '',
      category: data.category || '',
      description: data.description || '',
    };

    await storage.create('settings', newSetting);
    await loadSettings();
  };

  // 更新设定
  const updateSetting = async (id: string, data: Partial<SettingCard>) => {
    const storage = await getStorageAdapter();
    const existing = settings.find(s => s.id === id);
    if (!existing) {
      throw new Error('Setting not found');
    }

    const updated: SettingCard = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await storage.update('settings', id, updated);
    await loadSettings();
  };

  // 删除设定
  const deleteSetting = async (id: string) => {
    const storage = await getStorageAdapter();
    await storage.delete('settings', id);
    await loadSettings();
  };

  return {
    settings,
    loading,
    error,
    createSetting,
    updateSetting,
    deleteSetting,
    reload: loadSettings,
  };
}

