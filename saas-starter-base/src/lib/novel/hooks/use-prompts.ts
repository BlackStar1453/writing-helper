/**
 * Prompt卡片数据管理 Hook
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { PromptCard, StorageAdapter } from '../types';
import { getStorageAdapter } from '../platform-utils';
import { generateUUID } from '../platform-utils';

export function usePrompts(novelId?: string | null) {
  const [prompts, setPrompts] = useState<PromptCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageRef = useRef<StorageAdapter | null>(null);

  // 初始化存储适配器
  useEffect(() => {
    getStorageAdapter().then(adapter => {
      storageRef.current = adapter;
      loadPrompts();
    });
  }, [novelId]); // 当novelId变化时重新加载

  /**
   * 加载Prompt卡片列表
   */
  const loadPrompts = async () => {
    if (!storageRef.current) return;

    try {
      setLoading(true);
      setError(null);

      let allPrompts: PromptCard[];
      if (novelId) {
        // 如果有novelId,只加载该项目的prompts
        allPrompts = await storageRef.current.listByNovelId('prompts', novelId);
      } else {
        // 否则加载所有prompts
        allPrompts = await storageRef.current.list('prompts');
      }

      setPrompts(allPrompts);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load prompts';
      setError(errorMsg);
      console.error('Failed to load prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建Prompt卡片
   */
  const createPrompt = async (data: Partial<PromptCard>): Promise<string> => {
    if (!storageRef.current) throw new Error('Storage not initialized');
    if (!novelId) throw new Error('novelId is required to create a prompt');

    try {
      const newPrompt = {
        ...data,
        novelId, // 添加novelId
        exampleBefore: data.exampleBefore || '',
        exampleAfter: data.exampleAfter || '',
      };

      const id = await storageRef.current.create('prompts', newPrompt);
      await loadPrompts();
      return id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create prompt';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 更新Prompt卡片
   */
  const updatePrompt = async (id: string, data: Partial<PromptCard>): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      await storageRef.current.update('prompts', id, data);
      await loadPrompts();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update prompt';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * 删除Prompt卡片
   */
  const deletePrompt = async (id: string): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    try {
      await storageRef.current.delete('prompts', id);
      await loadPrompts();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete prompt';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return {
    prompts,
    loading,
    error,
    createPrompt,
    updatePrompt,
    deletePrompt,
    reload: loadPrompts,
  };
}

