/**
 * Prompt卡片管理页面
 */

'use client';

import React, { useState } from 'react';
import { usePrompts } from '@/lib/novel/hooks/use-prompts';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { PromptCard } from '@/components/novel/PromptCard';
import { PromptDialog } from '@/components/novel/PromptDialog';
import { NovelNav } from '@/components/novel/NovelNav';
import { Button } from '@/components/ui/button';
import { PromptCard as PromptCardType } from '@/lib/novel/types';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PromptsPage() {
  const { currentNovelId } = useNovels();
  const {
    prompts,
    loading,
    error,
    createPrompt,
    updatePrompt,
    deletePrompt
  } = usePrompts(currentNovelId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptCardType | null>(null);

  const handleCreate = () => {
    setEditingPrompt(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (prompt: PromptCardType) => {
    setEditingPrompt(prompt);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<PromptCardType>) => {
    try {
      if (editingPrompt) {
        await updatePrompt(editingPrompt.id, data);
        toast.success('Prompt卡片更新成功!');
      } else {
        await createPrompt(data);
        toast.success('Prompt卡片创建成功!');
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast.error('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个Prompt卡片吗?')) {
      try {
        await deletePrompt(id);
        toast.success('Prompt卡片删除成功!');
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

  return (
    <>
      <NovelNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Prompt卡片管理</h1>
            <p className="text-gray-500 mt-2">管理你的写作风格和要求</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            创建Prompt卡片
          </Button>
        </div>

        {prompts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">还没有创建任何Prompt卡片</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个Prompt卡片
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <PromptDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          prompt={editingPrompt}
        />
      </div>
    </>
  );
}

