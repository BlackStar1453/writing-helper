'use client';

import { useState } from 'react';
import { useWorldTimeline } from '@/lib/novel/hooks/use-world-timeline';
import { useCharacters } from '@/lib/novel/hooks/use-characters';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { WorldTimelineEvent, Character } from '@/lib/novel/types';
import { NovelNav } from '@/components/novel/NovelNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TimelinePage() {
  const { currentNovelId } = useNovels();
  const { events, loading: eventsLoading, createEvent, updateEvent, deleteEvent } = useWorldTimeline(currentNovelId);
  const { characters, loading: charactersLoading } = useCharacters(currentNovelId);
  
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WorldTimelineEvent | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    date: '',
    title: '',
    description: '',
    type: 'world' as 'world' | 'background'
  });

  const handleCreateEvent = async () => {
    console.log('handleCreateEvent called with formData:', formData);

    // 验证必填字段
    if (!formData.date || !formData.title) {
      alert('请填写日期和标题');
      return;
    }

    try {
      console.log('Calling createEvent...');
      const id = await createEvent(formData);
      console.log('Event created with id:', id);
      setIsCreateDialogOpen(false);
      setFormData({ date: '', title: '', description: '', type: 'world' });
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('创建事件失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    
    try {
      await updateEvent(editingEvent.id, formData);
      setEditingEvent(null);
      setFormData({ date: '', title: '', description: '', type: 'world' });
    } catch (err) {
      console.error('Failed to update event:', err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('确定要删除这个事件吗?')) return;
    
    try {
      await deleteEvent(id);
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleEditEvent = (event: WorldTimelineEvent) => {
    setEditingEvent(event);
    setFormData({
      date: event.date,
      title: event.title,
      description: event.description || '',
      type: event.type
    });
  };

  const toggleCharacterSelection = (characterId: string) => {
    setSelectedCharacterIds(prev => 
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  // 获取选中的人物
  const selectedCharacters = characters.filter(c => selectedCharacterIds.includes(c.id));

  if (eventsLoading || charactersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <NovelNav />
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">世界时间线</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加事件
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建世界事件</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="date">日期</Label>
                <Input
                  id="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  placeholder="YYYY-MM-DD 或 灵活描述(如: 春天)"
                />
              </div>
              <div>
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="事件标题"
                />
              </div>
              <div>
                <Label htmlFor="type">类型</Label>
                <Select value={formData.type} onValueChange={(value: 'world' | 'background') => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="world">世界事件</SelectItem>
                    <SelectItem value="background">背景变化</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="事件描述"
                  rows={4}
                />
              </div>
              <Button onClick={handleCreateEvent} className="w-full">创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 人物选择器 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>选择人物时间线</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {characters.map(character => (
              <button
                key={character.id}
                onClick={() => toggleCharacterSelection(character.id)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCharacterIds.includes(character.id)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {character.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 时间线可视化 */}
      <div className="space-y-4">
        {/* 世界事件 */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">世界事件</h2>
          {events.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
                暂无世界事件,点击上方按钮添加
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                            {event.date}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                            {event.type === 'world' ? '世界事件' : '背景变化'}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEvent(event)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 人物时间线 */}
        {selectedCharacters.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">人物时间线</h2>
            <div className="space-y-4">
              {selectedCharacters.map(character => (
                <Card key={character.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{character.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {character.timeline && character.timeline.length > 0 ? (
                      <div className="space-y-2">
                        {character.timeline.map(event => (
                          <div key={event.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded">
                              {event.date}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">{event.title}</div>
                              {event.description && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {event.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">该人物暂无时间线事件</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑世界事件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-date">日期</Label>
              <Input
                id="edit-date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                placeholder="YYYY-MM-DD 或 灵活描述(如: 春天)"
              />
            </div>
            <div>
              <Label htmlFor="edit-title">标题</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="事件标题"
              />
            </div>
            <div>
              <Label htmlFor="edit-type">类型</Label>
              <Select value={formData.type} onValueChange={(value: 'world' | 'background') => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="world">世界事件</SelectItem>
                  <SelectItem value="background">背景变化</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="事件描述"
                rows={4}
              />
            </div>
            <Button onClick={handleUpdateEvent} className="w-full">保存</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}

