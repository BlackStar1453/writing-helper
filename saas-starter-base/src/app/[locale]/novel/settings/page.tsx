/**
 * 设定卡片管理页面
 */

'use client';

import React, { useState } from 'react';
import { useSettings } from '@/lib/novel/hooks/use-settings';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { SettingCard } from '@/components/novel/SettingCard';
import { SettingDialog } from '@/components/novel/SettingDialog';
import { NovelNav } from '@/components/novel/NovelNav';
import { Button } from '@/components/ui/button';
import { SettingCard as SettingCardType } from '@/lib/novel/types';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { currentNovelId } = useNovels();
  const {
    settings,
    loading,
    error,
    createSetting,
    updateSetting,
    deleteSetting
  } = useSettings(currentNovelId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SettingCardType | null>(null);

  const handleCreate = () => {
    setEditingSetting(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (setting: SettingCardType) => {
    setEditingSetting(setting);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<SettingCardType>) => {
    try {
      if (editingSetting) {
        await updateSetting(editingSetting.id, data);
        toast.success('设定卡片更新成功!');
      } else {
        await createSetting(data);
        toast.success('设定卡片创建成功!');
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast.error('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个设定卡片吗?')) {
      try {
        await deleteSetting(id);
        toast.success('设定卡片删除成功!');
      } catch (err) {
        toast.error('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
      }
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

  // 按分类分组
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SettingCardType[]>);

  return (
    <>
      <NovelNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">设定卡片管理</h1>
            <p className="text-gray-500 mt-2">管理小说的世界设定、背景设定、功能设定等</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            创建设定卡片
          </Button>
        </div>

        {settings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">还没有创建任何设定卡片</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个设定卡片
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedSettings).map(([category, categorySettings]) => (
              <div key={category}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded">
                    {category}
                  </span>
                  <span className="text-sm text-gray-500">({categorySettings.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorySettings.map((setting) => (
                    <SettingCard
                      key={setting.id}
                      setting={setting}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <SettingDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          setting={editingSetting}
        />
      </div>
    </>
  );
}

