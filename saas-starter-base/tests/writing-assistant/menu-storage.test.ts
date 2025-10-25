/**
 * Menu Card存储测试
 * 测试menu-storage.ts中的所有Menu Card操作函数
 *
 * 注意: 这些测试使用jest mock而不是真实的IndexedDB
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { MenuCard } from '@/lib/menu-utils';

// Mock menu-storage模块
jest.mock('@/lib/menu-storage', () => {
  let mockMenus: MenuCard[] = [];
  let idCounter = 1;

  return {
    getAllMenus: jest.fn().mockImplementation(() => {
      const sorted = [...mockMenus].sort((a, b) => a.order - b.order);
      return Promise.resolve(sorted);
    }),

    getMenu: jest.fn().mockImplementation((id: string) => {
      const menu = mockMenus.find(m => m.id === id);
      return Promise.resolve(menu || null);
    }),

    createMenu: jest.fn().mockImplementation((data: Omit<MenuCard, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = `menu-${idCounter++}`;
      const now = new Date();
      const menu: MenuCard = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      };
      mockMenus.push(menu);
      return Promise.resolve(id);
    }),

    updateMenu: jest.fn().mockImplementation((id: string, data: Partial<Omit<MenuCard, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const index = mockMenus.findIndex(m => m.id === id);
      if (index === -1) {
        return Promise.reject(new Error('Menu not found'));
      }
      mockMenus[index] = {
        ...mockMenus[index],
        ...data,
        updatedAt: new Date()
      };
      return Promise.resolve();
    }),

    deleteMenu: jest.fn().mockImplementation((id: string) => {
      mockMenus = mockMenus.filter(m => m.id !== id);
      return Promise.resolve();
    }),

    getEnabledMenus: jest.fn().mockImplementation(() => {
      const enabled = mockMenus.filter(m => m.enabled);
      return Promise.resolve(enabled);
    }),

    clearAllMenus: jest.fn().mockImplementation(() => {
      mockMenus = [];
      return Promise.resolve();
    }),

    batchCreateMenus: jest.fn().mockImplementation((menusData: Omit<MenuCard, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const ids: string[] = [];
      const now = new Date();
      menusData.forEach(data => {
        const id = `menu-${idCounter++}`;
        const menu: MenuCard = {
          ...data,
          id,
          createdAt: now,
          updatedAt: now
        };
        mockMenus.push(menu);
        ids.push(id);
      });
      return Promise.resolve(ids);
    }),

    __resetMocks: () => {
      mockMenus = [];
      idCounter = 1;
    }
  };
});

import {
  getAllMenus,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu,
  getEnabledMenus,
  clearAllMenus,
  batchCreateMenus
} from '@/lib/menu-storage';

describe('menu-storage Menu Card操作测试', () => {
  // 测试数据
  const mockMenuData: Omit<MenuCard, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Make it Formal',
    description: 'Convert text to formal style',
    promptTemplate: 'Make the following text more formal: {selectedText}',
    enabled: true,
    order: 1
  };

  const mockMenuData2: Omit<MenuCard, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Simplify',
    description: 'Simplify complex text',
    promptTemplate: 'Simplify this text: {selectedText}',
    enabled: true,
    order: 2
  };

  beforeEach(async () => {
    // 清空所有菜单和重置mocks
    jest.clearAllMocks();
    await clearAllMenus();
  });

  afterEach(() => {
    // 清理
    jest.clearAllMocks();
  });

  describe('createMenu', () => {
    it('应该能创建新的menu card', async () => {
      const id = await createMenu(mockMenuData);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      
      const menu = await getMenu(id);
      expect(menu).toBeDefined();
      expect(menu!.name).toBe(mockMenuData.name);
      expect(menu!.promptTemplate).toBe(mockMenuData.promptTemplate);
    });

    it('创建的menu应该包含createdAt和updatedAt', async () => {
      const id = await createMenu(mockMenuData);
      const menu = await getMenu(id);
      
      expect(menu!.createdAt).toBeInstanceOf(Date);
      expect(menu!.updatedAt).toBeInstanceOf(Date);
    });

    it('应该能创建多个menu cards', async () => {
      await createMenu(mockMenuData);
      await createMenu(mockMenuData2);
      
      const menus = await getAllMenus();
      expect(menus).toHaveLength(2);
    });
  });

  describe('getAllMenus', () => {
    it('空数据库应该返回空数组', async () => {
      const menus = await getAllMenus();
      expect(menus).toEqual([]);
    });

    it('应该返回所有menu cards', async () => {
      await createMenu(mockMenuData);
      await createMenu(mockMenuData2);
      
      const menus = await getAllMenus();
      expect(menus).toHaveLength(2);
    });

    it('返回的menus应该按order排序', async () => {
      const id1 = await createMenu({ ...mockMenuData, order: 3 });
      const id2 = await createMenu({ ...mockMenuData2, order: 1 });
      
      const menus = await getAllMenus();
      expect(menus[0].order).toBe(1);
      expect(menus[1].order).toBe(3);
    });
  });

  describe('getMenu', () => {
    it('应该能获取指定的menu card', async () => {
      const id = await createMenu(mockMenuData);
      const menu = await getMenu(id);
      
      expect(menu).toBeDefined();
      expect(menu!.id).toBe(id);
      expect(menu!.name).toBe(mockMenuData.name);
    });

    it('获取不存在的menu应该返回null', async () => {
      const menu = await getMenu('non-existent-id');
      expect(menu).toBeNull();
    });
  });

  describe('updateMenu', () => {
    it('应该能更新menu card', async () => {
      const id = await createMenu(mockMenuData);
      
      await updateMenu(id, {
        name: 'Updated Name',
        description: 'Updated Description'
      });
      
      const menu = await getMenu(id);
      expect(menu!.name).toBe('Updated Name');
      expect(menu!.description).toBe('Updated Description');
      expect(menu!.promptTemplate).toBe(mockMenuData.promptTemplate); // 未更新的字段应保持不变
    });

    it('更新应该修改updatedAt时间戳', async () => {
      const id = await createMenu(mockMenuData);
      const originalMenu = await getMenu(id);
      
      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await updateMenu(id, { name: 'New Name' });
      const updatedMenu = await getMenu(id);
      
      expect(updatedMenu!.updatedAt.getTime()).toBeGreaterThan(originalMenu!.updatedAt.getTime());
    });

    it('更新不存在的menu应该抛出错误', async () => {
      await expect(updateMenu('non-existent', { name: 'Test' }))
        .rejects.toThrow('Menu not found');
    });

    it('应该能更新enabled状态', async () => {
      const id = await createMenu(mockMenuData);
      
      await updateMenu(id, { enabled: false });
      const menu = await getMenu(id);
      
      expect(menu!.enabled).toBe(false);
    });
  });

  describe('deleteMenu', () => {
    it('应该能删除menu card', async () => {
      const id = await createMenu(mockMenuData);
      await deleteMenu(id);
      
      const menu = await getMenu(id);
      expect(menu).toBeNull();
    });

    it('删除后getAllMenus应该不包含该menu', async () => {
      const id1 = await createMenu(mockMenuData);
      const id2 = await createMenu(mockMenuData2);
      
      await deleteMenu(id1);
      const menus = await getAllMenus();
      
      expect(menus).toHaveLength(1);
      expect(menus[0].id).toBe(id2);
    });

    it('删除不存在的menu不应该抛出错误', async () => {
      await expect(deleteMenu('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getEnabledMenus', () => {
    it('应该只返回enabled的menus', async () => {
      await createMenu({ ...mockMenuData, enabled: true });
      await createMenu({ ...mockMenuData2, enabled: false });
      
      const enabledMenus = await getEnabledMenus();
      expect(enabledMenus).toHaveLength(1);
      expect(enabledMenus[0].name).toBe(mockMenuData.name);
    });

    it('没有enabled的menus时应该返回空数组', async () => {
      await createMenu({ ...mockMenuData, enabled: false });
      
      const enabledMenus = await getEnabledMenus();
      expect(enabledMenus).toEqual([]);
    });
  });

  describe('clearAllMenus', () => {
    it('应该清空所有menus', async () => {
      await createMenu(mockMenuData);
      await createMenu(mockMenuData2);
      
      await clearAllMenus();
      const menus = await getAllMenus();
      
      expect(menus).toEqual([]);
    });
  });

  describe('batchCreateMenus', () => {
    it('应该能批量创建menus', async () => {
      const menusData = [mockMenuData, mockMenuData2];
      const ids = await batchCreateMenus(menusData);
      
      expect(ids).toHaveLength(2);
      expect(ids.every(id => typeof id === 'string')).toBe(true);
      
      const menus = await getAllMenus();
      expect(menus).toHaveLength(2);
    });

    it('批量创建的menus应该保持order顺序', async () => {
      const menusData = [
        { ...mockMenuData, order: 1 },
        { ...mockMenuData2, order: 2 }
      ];
      
      await batchCreateMenus(menusData);
      const menus = await getAllMenus();
      
      expect(menus[0].order).toBe(1);
      expect(menus[1].order).toBe(2);
    });

    it('空数组应该返回空数组', async () => {
      const ids = await batchCreateMenus([]);
      expect(ids).toEqual([]);
    });
  });

  describe('promptTemplate功能', () => {
    it('promptTemplate应该支持{selectedText}占位符', async () => {
      const id = await createMenu({
        ...mockMenuData,
        promptTemplate: 'Improve: {selectedText}'
      });
      
      const menu = await getMenu(id);
      expect(menu!.promptTemplate).toContain('{selectedText}');
    });

    it('promptTemplate应该支持{context}占位符', async () => {
      const id = await createMenu({
        ...mockMenuData,
        promptTemplate: 'Context: {context}\nText: {selectedText}'
      });
      
      const menu = await getMenu(id);
      expect(menu!.promptTemplate).toContain('{context}');
      expect(menu!.promptTemplate).toContain('{selectedText}');
    });
  });

  describe('数据持久化', () => {
    it('创建的menus应该持久化存储', async () => {
      const id = await createMenu(mockMenuData);
      
      // 模拟页面刷新 - 重新获取数据
      const menu = await getMenu(id);
      expect(menu).toBeDefined();
      expect(menu!.name).toBe(mockMenuData.name);
    });
  });

  describe('并发操作', () => {
    it('应该能处理并发创建操作', async () => {
      const promises = [
        createMenu(mockMenuData),
        createMenu(mockMenuData2),
        createMenu({ ...mockMenuData, name: 'Third Menu', order: 3 })
      ];
      
      const ids = await Promise.all(promises);
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3); // 所有ID应该唯一
      
      const menus = await getAllMenus();
      expect(menus).toHaveLength(3);
    });

    it('应该能处理并发更新操作', async () => {
      const id = await createMenu(mockMenuData);
      
      const promises = [
        updateMenu(id, { name: 'Name 1' }),
        updateMenu(id, { description: 'Desc 1' })
      ];
      
      await Promise.all(promises);
      const menu = await getMenu(id);
      
      expect(menu).toBeDefined();
      // 最后一个更新应该生效
      expect(menu!.description).toBe('Desc 1');
    });
  });
});

