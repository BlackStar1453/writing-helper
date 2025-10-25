/**
 * Menu卡片管理Hook
 */

'use client';

import { useState, useEffect } from 'react';
import { MenuCard } from '../types';
import { getStorageAdapter } from '../platform-utils';

export function useMenus(novelId: string | null) {
  const [menus, setMenus] = useState<MenuCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载菜单列表
  const loadMenus = async () => {
    if (!novelId) {
      setMenus([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const storage = await getStorageAdapter();
      const allMenus = await storage.list('menus');
      const filteredMenus = allMenus
        .filter((menu: MenuCard) => menu.novelId === novelId)
        .sort((a: MenuCard, b: MenuCard) => a.order - b.order); // 按order排序
      setMenus(filteredMenus);
      setError(null);
    } catch (err) {
      console.error('Failed to load menus:', err);
      setError(err instanceof Error ? err.message : 'Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenus();
  }, [novelId]);

  // 创建菜单
  const createMenu = async (data: Partial<MenuCard>) => {
    if (!novelId) {
      throw new Error('No novel selected');
    }

    const storage = await getStorageAdapter();
    const newMenu: Omit<MenuCard, 'id' | 'createdAt' | 'updatedAt'> = {
      novelId,
      name: data.name || '',
      description: data.description || '',
      promptTemplate: data.promptTemplate || '',
      enabled: data.enabled !== undefined ? data.enabled : true,
      order: data.order !== undefined ? data.order : menus.length,
    };

    await storage.create('menus', newMenu);
    await loadMenus();
  };

  // 更新菜单
  const updateMenu = async (id: string, data: Partial<MenuCard>) => {
    const storage = await getStorageAdapter();
    const existing = menus.find(m => m.id === id);
    if (!existing) {
      throw new Error('Menu not found');
    }

    const updated: MenuCard = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await storage.update('menus', id, updated);
    await loadMenus();
  };

  // 删除菜单
  const deleteMenu = async (id: string) => {
    const storage = await getStorageAdapter();
    await storage.delete('menus', id);
    await loadMenus();
  };

  // 获取启用的菜单
  const getEnabledMenus = () => {
    return menus.filter(menu => menu.enabled);
  };

  return {
    menus,
    loading,
    error,
    createMenu,
    updateMenu,
    deleteMenu,
    getEnabledMenus,
    reload: loadMenus,
  };
}

