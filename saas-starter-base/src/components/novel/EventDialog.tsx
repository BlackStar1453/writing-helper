/**
 * 事件卡片编辑对话框
 */

import { useState, useEffect } from 'react';
import { EventCard, EventProcess, Character, Location } from '@/lib/novel/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { generateUUID } from '@/lib/novel/platform-utils';
import { toast } from 'sonner';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventCard | null;
  characters: Character[];
  locations: Location[];
  onCreate: (
    name: string,
    outline: string,
    process: EventProcess[],
    relatedCharacterIds: string[],
    relatedLocationIds: string[]
  ) => Promise<EventCard>;
  onUpdate: (
    id: string,
    updates: {
      name?: string;
      outline?: string;
      process?: EventProcess[];
      relatedCharacterIds?: string[];
      relatedLocationIds?: string[];
    }
  ) => Promise<void>;
}

export function EventDialog({
  isOpen,
  onClose,
  event,
  characters,
  locations,
  onCreate,
  onUpdate,
}: EventDialogProps) {
  const [name, setName] = useState('');
  const [outline, setOutline] = useState('');
  const [process, setProcess] = useState<EventProcess[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      if (event) {
        setName(event.name);
        setOutline(event.outline);
        setProcess(event.process);
        setSelectedCharacterIds(event.relatedCharacterIds);
        setSelectedLocationIds(event.relatedLocationIds);
      } else {
        setName('');
        setOutline('');
        setProcess([{ id: generateUUID(), order: 1, description: '' }]);
        setSelectedCharacterIds([]);
        setSelectedLocationIds([]);
      }
    }
  }, [isOpen, event]);

  const handleAddStep = () => {
    const newStep: EventProcess = {
      id: generateUUID(),
      order: process.length + 1,
      description: '',
    };
    setProcess([...process, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    const newProcess = process.filter(p => p.id !== id);
    // 重新排序
    newProcess.forEach((p, index) => {
      p.order = index + 1;
    });
    setProcess(newProcess);
  };

  const handleStepChange = (id: string, description: string) => {
    setProcess(process.map(p => (p.id === id ? { ...p, description } : p)));
  };

  const handleMoveStep = (id: string, direction: 'up' | 'down') => {
    const index = process.findIndex(p => p.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === process.length - 1) return;

    const newProcess = [...process];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newProcess[index], newProcess[targetIndex]] = [newProcess[targetIndex], newProcess[index]];
    
    // 重新排序
    newProcess.forEach((p, i) => {
      p.order = i + 1;
    });
    
    setProcess(newProcess);
  };

  const toggleCharacter = (id: string) => {
    setSelectedCharacterIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleLocation = (id: string) => {
    setSelectedLocationIds(prev =>
      prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请输入事件名称');
      return;
    }
    if (!outline.trim()) {
      toast.error('请输入事件大纲');
      return;
    }
    if (process.length === 0 || process.every(p => !p.description.trim())) {
      toast.error('请至少添加一个事件流程步骤');
      return;
    }

    // 过滤掉空的步骤
    const validProcess = process.filter(p => p.description.trim());

    try {
      if (event) {
        await onUpdate(event.id, {
          name,
          outline,
          process: validProcess,
          relatedCharacterIds: selectedCharacterIds,
          relatedLocationIds: selectedLocationIds,
        });
        toast.success('事件卡片已更新');
      } else {
        await onCreate(name, outline, validProcess, selectedCharacterIds, selectedLocationIds);
        toast.success('事件卡片已创建');
      }
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? '编辑事件卡片' : '创建事件卡片'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 事件名称 */}
          <div>
            <label className="text-sm font-medium">事件名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 真心话游戏开始"
            />
          </div>

          {/* 事件大纲 */}
          <div>
            <label className="text-sm font-medium">事件大纲</label>
            <Textarea
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              placeholder="简要描述这个事件的概要..."
              rows={3}
            />
          </div>

          {/* 参与人物 */}
          <div>
            <label className="text-sm font-medium">参与人物</label>
            {characters.length === 0 ? (
              <p className="text-sm text-gray-500">暂无人物卡片</p>
            ) : (
              <div className="space-y-2 mt-2">
                {characters.map((character) => (
                  <div key={character.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`character-${character.id}`}
                      checked={selectedCharacterIds.includes(character.id)}
                      onCheckedChange={() => toggleCharacter(character.id)}
                    />
                    <label
                      htmlFor={`character-${character.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {character.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 发生地点 */}
          <div>
            <label className="text-sm font-medium">发生地点</label>
            {locations.length === 0 ? (
              <p className="text-sm text-gray-500">暂无地点卡片</p>
            ) : (
              <div className="space-y-2 mt-2">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location.id}`}
                      checked={selectedLocationIds.includes(location.id)}
                      onCheckedChange={() => toggleLocation(location.id)}
                    />
                    <label
                      htmlFor={`location-${location.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {location.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 事件流程 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">事件流程 (前因后果)</label>
              <Button size="sm" variant="outline" onClick={handleAddStep}>
                添加步骤
              </Button>
            </div>
            <div className="space-y-2">
              {process.map((step, index) => (
                <div key={step.id} className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium mt-1">
                    {index + 1}
                  </div>
                  <Textarea
                    value={step.description}
                    onChange={(e) => handleStepChange(step.id, e.target.value)}
                    placeholder={`第 ${index + 1} 步...`}
                    rows={2}
                    className="flex-1"
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMoveStep(step.id, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMoveStep(step.id, 'down')}
                      disabled={index === process.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveStep(step.id)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {event ? '保存' : '创建'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

