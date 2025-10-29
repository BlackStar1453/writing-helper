/**
 * 小说项目管理页面
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NovelNav } from '@/components/novel/NovelNav';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Plus, Trash2, Settings } from 'lucide-react';

export default function NovelProjectsPage() {
  const router = useRouter();
  const { novels, currentNovel, createNovel, deleteNovel, switchNovel, loading } = useNovels();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    globalPrompt: '',
  });

  const handleCreateNovel = async () => {
    if (!formData.title.trim()) {
      alert('请输入小说标题');
      return;
    }

    try {
      const id = await createNovel({
        title: formData.title,
        description: formData.description,
        globalPrompt: formData.globalPrompt,
      });

      // 切换到新创建的项目
      switchNovel(id);

      // 重置表单
      setFormData({
        title: '',
        description: '',
        globalPrompt: '',
      });

      setIsCreateDialogOpen(false);

      // 跳转到章节页面
      router.push('/novel/chapters');
    } catch (err) {
      console.error('Failed to create novel:', err);
      alert('创建失败,请重试');
    }
  };

  const handleDeleteNovel = async (id: string, title: string) => {
    if (!confirm(`确定要删除项目"${title}"吗?此操作不可恢复!`)) {
      return;
    }

    try {
      await deleteNovel(id);
    } catch (err) {
      console.error('Failed to delete novel:', err);
      alert('删除失败,请重试');
    }
  };

  const handleSwitchNovel = (id: string) => {
    switchNovel(id);
    router.push('/novel/chapters');
  };

  if (loading) {
    return (
      <NovelNav>
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">加载中...</div>
        </div>
      </NovelNav>
    );
  }

  return (
    <NovelNav>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">小说项目</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建新项目
              </Button>
            </DialogTrigger>
            <DialogContent>
              <h2 className="text-xl font-bold mb-4">创建新项目</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">项目标题 *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="例如: The Game"
                  />
                </div>
                <div>
                  <Label htmlFor="description">项目简介</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="简要描述这部小说的主题和内容..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="globalPrompt">全局写作Prompt</Label>
                  <Textarea
                    id="globalPrompt"
                    value={formData.globalPrompt}
                    onChange={(e) => setFormData({ ...formData, globalPrompt: e.target.value })}
                    placeholder="设置全局的写作风格、语气等要求..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateNovel}>创建</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {novels.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">还没有任何项目</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个项目
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {novels.map((novel) => {
              const isCurrent = currentNovel?.id === novel.id;
              return (
                <div
                  key={novel.id}
                  className={`p-6 border rounded-lg transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:shadow-lg'
                  }`}
                  onClick={() => !isCurrent && handleSwitchNovel(novel.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className={`h-5 w-5 ${isCurrent ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <h3 className="text-lg font-semibold">{novel.title}</h3>
                    </div>
                    {isCurrent && (
                      <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded">
                        当前项目
                      </span>
                    )}
                  </div>

                  {novel.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {novel.description}
                    </p>
                  )}

                  <div className="text-xs text-gray-500 mb-4">
                    创建于 {new Date(novel.createdAt).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/novel/projects/${novel.id}/settings`);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      设置
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNovel(novel.id, novel.title);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </NovelNav>
  );
}

