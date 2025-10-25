/**
 * 章节列表页面
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NovelNav } from '@/components/novel/NovelNav';
import { useChapters } from '@/lib/novel/hooks/use-chapters';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function ChapterListPage() {
  const router = useRouter();
  const { currentNovelId } = useNovels();
  const { chapters, createChapter, deleteChapter } = useChapters(currentNovelId);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    volumeId: '',
    chapterId: '',
    sectionId: '',
    title: '',
  });

  const handleCreateChapter = async () => {
    if (!formData.volumeId || !formData.chapterId || !formData.sectionId || !formData.title) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      const id = await createChapter({
        volumeId: formData.volumeId,
        chapterId: formData.chapterId,
        sectionId: formData.sectionId,
        title: formData.title,
        content: '',
      });

      setIsCreateDialogOpen(false);
      setFormData({ volumeId: '', chapterId: '', sectionId: '', title: '' });

      // 跳转到写作页面
      router.push(`/novel/writing/${id}`);
    } catch (err) {
      console.error('Failed to create chapter:', err);
      alert('创建章节失败');
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm('确定要删除这个章节吗？')) return;

    try {
      await deleteChapter(id);
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      alert('删除章节失败');
    }
  };

  return (
    <NovelNav>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-light text-gray-900 dark:text-white">章节管理</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              >
                创建章节
              </Button>
            </DialogTrigger>
            <DialogContent>
              <h2 className="text-xl font-medium mb-6">创建新章节</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="volumeId" className="text-sm font-light">卷</Label>
                  <Input
                    id="volumeId"
                    value={formData.volumeId}
                    onChange={(e) => setFormData({ ...formData, volumeId: e.target.value })}
                    placeholder="例如: 第一卷"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="chapterId" className="text-sm font-light">章</Label>
                  <Input
                    id="chapterId"
                    value={formData.chapterId}
                    onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
                    placeholder="例如: 第一章"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sectionId" className="text-sm font-light">节</Label>
                  <Input
                    id="sectionId"
                    value={formData.sectionId}
                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                    placeholder="例如: 第一节"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="title" className="text-sm font-light">标题</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="章节标题"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleCreateChapter} className="w-full mt-6">
                  创建
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {chapters.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 dark:text-gray-600 font-light mb-4">
              暂无章节
            </p>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(true)}
              className="border-gray-200 dark:border-gray-700"
            >
              创建第一个章节
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="group px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg cursor-pointer"
                onClick={() => router.push(`/novel/writing/${chapter.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                      {chapter.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
                      {chapter.volumeId} &gt; {chapter.chapterId} &gt; {chapter.sectionId}
                      <span className="mx-2">·</span>
                      {chapter.content ? `${chapter.content.length} 字` : '未开始'}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/novel/writing/${chapter.id}`);
                      }}
                      className="text-gray-600 dark:text-gray-400"
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(chapter.id);
                      }}
                      className="text-red-600 dark:text-red-400"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </NovelNav>
  );
}

