/**
 * 小说项目管理 Hook
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Novel, StorageAdapter } from '../types';
import { getStorageAdapter } from '../platform-utils';
import { generateUUID } from '../platform-utils';

export function useNovels() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storageRef = useRef<StorageAdapter | null>(null);

  // 初始化存储适配器
  useEffect(() => {
    getStorageAdapter().then(adapter => {
      storageRef.current = adapter;
      loadNovels();
    });
  }, []);

  /**
   * 加载所有小说项目
   */
  const loadNovels = async () => {
    if (!storageRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const list = await storageRef.current.list('novels');
      setNovels(list);

      // 如果没有当前选中的小说,自动选中第一个
      if (!currentNovelId && list.length > 0) {
        setCurrentNovelId(list[0].id);
        // 保存到localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentNovelId', list[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load novels');
      console.error('Failed to load novels:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建小说项目
   */
  const createNovel = async (data: Partial<Novel>): Promise<string> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    const novel: Novel = {
      id: generateUUID(),
      title: data.title || 'Untitled Novel',
      description: data.description,
      globalPrompt: data.globalPrompt,
      coverImage: data.coverImage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const id = await storageRef.current.create('novels', novel);
    await loadNovels();

    // 自动切换到新创建的小说
    setCurrentNovelId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentNovelId', id);
    }

    return id;
  };

  /**
   * 更新小说项目
   */
  const updateNovel = async (id: string, data: Partial<Novel>): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    await storageRef.current.update('novels', id, {
      ...data,
      updatedAt: new Date(),
    });

    await loadNovels();
  };

  /**
   * 删除小说项目
   */
  const deleteNovel = async (id: string): Promise<void> => {
    if (!storageRef.current) throw new Error('Storage not initialized');

    await storageRef.current.delete('novels', id);
    await loadNovels();

    // 如果删除的是当前选中的小说,切换到第一个
    if (currentNovelId === id) {
      const remaining = novels.filter(n => n.id !== id);
      if (remaining.length > 0) {
        setCurrentNovelId(remaining[0].id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentNovelId', remaining[0].id);
        }
      } else {
        setCurrentNovelId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('currentNovelId');
        }
      }
    }
  };

  /**
   * 获取小说项目
   */
  const getNovelById = async (id: string): Promise<Novel | null> => {
    if (!storageRef.current) return null;

    try {
      return await storageRef.current.read('novels', id);
    } catch (err) {
      console.error('Failed to get novel:', err);
      return null;
    }
  };

  /**
   * 切换当前小说项目
   */
  const switchNovel = (id: string) => {
    setCurrentNovelId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentNovelId', id);
    }
  };

  /**
   * 获取当前小说项目
   */
  const currentNovel = novels.find(n => n.id === currentNovelId) || null;

  return {
    novels,
    currentNovel,
    currentNovelId,
    loading,
    error,
    createNovel,
    updateNovel,
    deleteNovel,
    getNovelById,
    switchNovel,
    loadNovels,
  };
}

