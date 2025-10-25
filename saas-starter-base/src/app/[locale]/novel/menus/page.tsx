/**
 * Menu卡片管理页面
 */

'use client';

import React, { useState } from 'react';
import { useMenus } from '@/lib/novel/hooks/use-menus';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { MenuCard } from '@/components/novel/MenuCard';
import { MenuDialog } from '@/components/novel/MenuDialog';
import { NovelNav } from '@/components/novel/NovelNav';
import { Button } from '@/components/ui/button';
import { MenuCard as MenuCardType } from '@/lib/novel/types';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MenusPage() {
  const { currentNovelId } = useNovels();
  const {
    menus,
    loading,
    error,
    createMenu,
    updateMenu,
    deleteMenu
  } = useMenus(currentNovelId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuCardType | null>(null);

  const handleCreate = () => {
    setEditingMenu(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (menu: MenuCardType) => {
    setEditingMenu(menu);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<MenuCardType>) => {
    try {
      if (editingMenu) {
        await updateMenu(editingMenu.id, data);
        toast.success('Menu卡片更新成功!');
      } else {
        await createMenu(data);
        toast.success('Menu卡片创建成功!');
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast.error('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个Menu卡片吗?')) {
      try {
        await deleteMenu(id);
        toast.success('Menu卡片删除成功!');
      } catch (err) {
        toast.error('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
      }
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateMenu(id, { enabled });
      toast.success(enabled ? '已启用' : '已禁用');
    } catch (err) {
      toast.error('操作失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <NovelNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Menu卡片管理</h1>
            <p className="text-gray-500 mt-2">自定义选择文本后的菜单选项</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            创建Menu卡片
          </Button>
        </div>

        {menus.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">还没有创建任何Menu卡片</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个Menu卡片
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleEnabled={handleToggleEnabled}
              />
            ))}
          </div>
        )}

        <MenuDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          menu={editingMenu}
        />
      </div>
    </>
  );
}

