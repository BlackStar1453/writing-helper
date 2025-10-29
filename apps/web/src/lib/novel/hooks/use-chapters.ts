/**
 * 章节管理 Hook
 */

'use client';

import { useState, useEffect } from 'react';
import { Chapter } from '../types';
import { getStorageAdapter } from '../storage';

export function useChapters(novelId?: string | null) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载所有章节
  useEffect(() => {
    loadChapters();
  }, [novelId]);

  const loadChapters = async () => {
    // 只在客户端执行
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const storage = getStorageAdapter();

      let data: Chapter[];
      if (novelId && storage.listByNovelId) {
        data = await storage.listByNovelId('chapters', novelId) as Chapter[];
      } else {
        data = await storage.list('chapters') as Chapter[];
      }

      console.log('Loaded chapters:', data);
      setChapters(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load chapters'));
      console.error('Failed to load chapters:', err);
    } finally {
      setLoading(false);
    }
  };

  // 创建章节
  const createChapter = async (chapterData: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt' | 'novelId'>): Promise<string> => {
    if (typeof window === 'undefined') {
      throw new Error('Cannot create chapter on server side');
    }
    if (!novelId) {
      throw new Error('novelId is required to create a chapter');
    }

    try {
      const storage = getStorageAdapter();
      const now = new Date();
      const newChapter: Chapter = {
        ...chapterData,
        novelId,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };

      const id = await storage.create('chapters', newChapter);
      await loadChapters();
      return id;
    } catch (err) {
      console.error('Failed to create chapter:', err);
      throw err;
    }
  };

  // 更新章节
  const updateChapter = async (id: string, updates: Partial<Chapter>): Promise<void> => {
    if (typeof window === 'undefined') {
      throw new Error('Cannot update chapter on server side');
    }

    try {
      const storage = getStorageAdapter();
      await storage.update('chapters', id, {
        ...updates,
        updatedAt: new Date(),
      });
      await loadChapters();
    } catch (err) {
      console.error('Failed to update chapter:', err);
      throw err;
    }
  };

  // 删除章节
  const deleteChapter = async (id: string): Promise<void> => {
    if (typeof window === 'undefined') {
      throw new Error('Cannot delete chapter on server side');
    }

    try {
      const storage = getStorageAdapter();
      await storage.delete('chapters', id);
      await loadChapters();
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      throw err;
    }
  };

  // 根据ID获取章节
  const getChapterById = async (id: string): Promise<Chapter | null> => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const storage = getStorageAdapter();
      const chapter = await storage.read('chapters', id);
      return chapter as Chapter | null;
    } catch (err) {
      console.error('Failed to get chapter:', err);
      return null;
    }
  };

  return {
    chapters,
    loading,
    error,
    createChapter,
    updateChapter,
    deleteChapter,
    getChapterById,
    reload: loadChapters,
  };
}

