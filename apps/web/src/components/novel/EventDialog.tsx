/**
 * 事件卡片编辑对话框
 */

import { useState, useEffect } from 'react';
import { EventCard, EventProcess, Character, Location, SettingCard } from '@/lib/novel/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { generateUUID } from '@/lib/novel/platform-utils';
import { toast } from 'sonner';
import { getSettings } from '@/lib/db-utils';
import { Loader2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * 可排序的步骤项组件
 */
interface SortableStepItemProps {
  step: EventProcess;
  index: number;
  onStepChange: (id: string, value: string) => void;
  onRemoveStep: (id: string) => void;
}

function SortableStepItem({ step, index, onStepChange, onRemoveStep }: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-grab active:cursor-grabbing mt-1"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* 步骤序号 */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium mt-1">
        {index + 1}
      </div>

      {/* 步骤内容 */}
      <Textarea
        value={step.description}
        onChange={(e) => onStepChange(step.id, e.target.value)}
        placeholder={`第 ${index + 1} 步...`}
        rows={2}
        className="flex-1"
      />

      {/* 删除按钮 */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onRemoveStep(step.id)}
        className="mt-1"
      >
        ×
      </Button>
    </div>
  );
}

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventCard | null;
  characters: Character[];
  locations: Location[];
  settings: SettingCard[];
  events: EventCard[];
  novelId: string;
  onCreateCharacter: (data: Partial<Character>) => Promise<string>;
  onCreate: (
    name: string,
    outline: string,
    process: EventProcess[],
    relatedCharacterIds: string[],
    relatedLocationIds: string[],
    relatedSettingIds: string[],
    relatedEventIds: string[]
  ) => Promise<EventCard>;
  onUpdate: (
    id: string,
    updates: {
      name?: string;
      outline?: string;
      process?: EventProcess[];
      relatedCharacterIds?: string[];
      relatedLocationIds?: string[];
      relatedSettingIds?: string[];
      relatedEventIds?: string[];
    }
  ) => Promise<void>;
}

export function EventDialog({
  isOpen,
  onClose,
  event,
  characters,
  locations,
  settings,
  events,
  novelId,
  onCreateCharacter,
  onCreate,
  onUpdate,
}: EventDialogProps) {
  const [name, setName] = useState('');
  const [outline, setOutline] = useState('');
  const [process, setProcess] = useState<EventProcess[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedSettingIds, setSelectedSettingIds] = useState<string[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [isGeneratingProcess, setIsGeneratingProcess] = useState(false);

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      if (event) {
        setName(event.name);
        setOutline(event.outline);
        setProcess(event.process);
        setSelectedCharacterIds(event.relatedCharacterIds);
        setSelectedLocationIds(event.relatedLocationIds);
        setSelectedSettingIds(event.relatedSettingIds || []);
        setSelectedEventIds(event.relatedEventIds || []);
      } else {
        setName('');
        setOutline('');
        setProcess([{ id: generateUUID(), order: 1, description: '' }]);
        setSelectedCharacterIds([]);
        setSelectedLocationIds([]);
        setSelectedSettingIds([]);
        setSelectedEventIds([]);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setProcess((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // 重新排序
        newItems.forEach((p, i) => {
          p.order = i + 1;
        });

        return newItems;
      });
    }
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

  const toggleSetting = (id: string) => {
    setSelectedSettingIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleEvent = (id: string) => {
    setSelectedEventIds(prev =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  // 生成事件流程
  const handleGenerateProcess = async () => {
    if (!name.trim()) {
      toast.error('请先输入事件名称');
      return;
    }
    if (!outline.trim()) {
      toast.error('请先输入事件大纲');
      return;
    }

    try {
      setIsGeneratingProcess(true);

      // 获取API设置
      const apiSettings = await getSettings();
      if (!apiSettings.apiToken) {
        toast.error('请先在设置中配置 API Token');
        return;
      }

      // 准备已关联的人物信息
      const existingCharacters = selectedCharacterIds.map(id => {
        const char = characters.find(c => c.id === id);
        return char ? {
          name: char.name,
          description: char.basicInfo.description
        } : null;
      }).filter(Boolean);

      // 准备关联的设定信息
      const relatedSettings = selectedSettingIds.map(id => {
        const setting = settings.find(s => s.id === id);
        return setting ? {
          name: setting.name,
          category: setting.category,
          description: setting.description
        } : null;
      }).filter(Boolean);

      // 准备关联的事件信息
      const relatedEvents = selectedEventIds.map(id => {
        const evt = events.find(e => e.id === id);
        return evt ? {
          name: evt.name,
          outline: evt.outline,
          process: evt.process.map(p => p.description).join(' -> ')
        } : null;
      }).filter(Boolean);

      // 调用API生成事件流程和人物信息
      const response = await fetch('/api/novel/generate-event-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventName: name,
          eventOutline: outline,
          apiToken: apiSettings.apiToken,
          model: apiSettings.aiModel,
          existingCharacters,
          relatedSettings,
          relatedEvents,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate event process');
      }

      const data = await response.json();

      // 将生成的流程转换为EventProcess格式
      const generatedProcess: EventProcess[] = data.process.map((item: { description: string }, index: number) => ({
        id: generateUUID(),
        order: index + 1,
        description: item.description,
      }));

      setProcess(generatedProcess);

      // 处理生成的人物信息
      if (data.characters && data.characters.length > 0) {
        const newCharacterIds: string[] = [];

        for (const charData of data.characters) {
          // 创建人物卡片
          const characterId = await onCreateCharacter({
            name: charData.name,
            basicInfo: {
              description: charData.description || '',
              appearance: charData.appearance || '',
              personality: charData.personality || '',
              characterArc: charData.characterArc || ''
            },
            timeline: [],
            relationships: [],
            references: []
          });

          newCharacterIds.push(characterId);
        }

        // 将新创建的人物添加到已选择的人物列表
        setSelectedCharacterIds(prev => [...prev, ...newCharacterIds]);

        toast.success(`事件流程已生成，并自动创建了 ${data.characters.length} 个人物卡片`);
      } else {
        toast.success('事件流程已生成');
      }
    } catch (err) {
      console.error('Failed to generate event process:', err);
      toast.error('生成事件流程失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsGeneratingProcess(false);
    }
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
          relatedSettingIds: selectedSettingIds,
          relatedEventIds: selectedEventIds,
        });
        toast.success('事件卡片已更新');
      } else {
        await onCreate(name, outline, validProcess, selectedCharacterIds, selectedLocationIds, selectedSettingIds, selectedEventIds);
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

          {/* 关联设定 */}
          <div>
            <label className="text-sm font-medium">关联设定</label>
            {settings.length === 0 ? (
              <p className="text-sm text-gray-500">暂无设定卡片</p>
            ) : (
              <div className="space-y-2 mt-2">
                {settings.map((setting) => (
                  <div key={setting.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`setting-${setting.id}`}
                      checked={selectedSettingIds.includes(setting.id)}
                      onCheckedChange={() => toggleSetting(setting.id)}
                    />
                    <label
                      htmlFor={`setting-${setting.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {setting.name} <span className="text-xs text-gray-500">({setting.category})</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 关联事件 */}
          <div>
            <label className="text-sm font-medium">关联事件</label>
            {events.filter(e => !event || e.id !== event.id).length === 0 ? (
              <p className="text-sm text-gray-500">暂无其他事件卡片</p>
            ) : (
              <div className="space-y-2 mt-2">
                {events.filter(e => !event || e.id !== event.id).map((evt) => (
                  <div key={evt.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`event-${evt.id}`}
                      checked={selectedEventIds.includes(evt.id)}
                      onCheckedChange={() => toggleEvent(evt.id)}
                    />
                    <label
                      htmlFor={`event-${evt.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {evt.name}
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateProcess}
                  disabled={isGeneratingProcess}
                >
                  {isGeneratingProcess ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    '生成事件流程'
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={handleAddStep}>
                  添加步骤
                </Button>
              </div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={process.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {process.map((step, index) => (
                    <SortableStepItem
                      key={step.id}
                      step={step}
                      index={index}
                      onStepChange={handleStepChange}
                      onRemoveStep={handleRemoveStep}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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

