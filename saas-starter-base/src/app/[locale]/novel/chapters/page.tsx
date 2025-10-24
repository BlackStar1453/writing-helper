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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">章节管理</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>创建章节</Button>
            </DialogTrigger>
            <DialogContent>
              <h2 className="text-xl font-bold mb-4">创建新章节</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="volumeId">卷</Label>
                  <Input
                    id="volumeId"
                    value={formData.volumeId}
                    onChange={(e) => setFormData({ ...formData, volumeId: e.target.value })}
                    placeholder="例如: 第一卷"
                  />
                </div>
                <div>
                  <Label htmlFor="chapterId">章</Label>
                  <Input
                    id="chapterId"
                    value={formData.chapterId}
                    onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
                    placeholder="例如: 第一章"
                  />
                </div>
                <div>
                  <Label htmlFor="sectionId">节</Label>
                  <Input
                    id="sectionId"
                    value={formData.sectionId}
                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                    placeholder="例如: 第一节"
                  />
                </div>
                <div>
                  <Label htmlFor="title">标题</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="章节标题"
                  />
                </div>
                <Button onClick={handleCreateChapter} className="w-full">
                  创建
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/novel/writing/${chapter.id}`)}
            >
              <h3 className="text-lg font-semibold mb-2">{chapter.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {chapter.volumeId} &gt; {chapter.chapterId} &gt; {chapter.sectionId}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {chapter.content ? `${chapter.content.length} 字` : '未开始'}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/novel/writing/${chapter.id}`);
                  }}
                >
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChapter(chapter.id);
                  }}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>

        {chapters.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无章节，点击"创建章节"开始创作
          </div>
        )}
      </div>
    </NovelNav>
  );
}

