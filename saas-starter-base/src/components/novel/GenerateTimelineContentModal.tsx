'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Character, Location, PromptCard, SettingCard, EventCard, ChapterTimelineItem } from '@/lib/novel/types';
import { User, MapPin, Sparkles, Settings, Calendar } from 'lucide-react';

interface GenerateTimelineContentSettings {
  selectedCharacterIds: string[];
  selectedLocationIds: string[];
  selectedPromptIds: string[];
  selectedSettingIds: string[];
  selectedEventIds: string[];
}

interface GenerateTimelineContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: GenerateTimelineContentSettings) => void;
  timelineItem: ChapterTimelineItem | null;
  allCharacters: Character[];
  allLocations: Location[];
  allPrompts: PromptCard[];
  allSettings: SettingCard[];
  allEvents: EventCard[];
}

export function GenerateTimelineContentModal({
  isOpen,
  onClose,
  onConfirm,
  timelineItem,
  allCharacters,
  allLocations,
  allPrompts,
  allSettings,
  allEvents,
}: GenerateTimelineContentModalProps) {
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [selectedSettingIds, setSelectedSettingIds] = useState<string[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setSelectedCharacterIds([]);
      setSelectedLocationIds([]);
      setSelectedPromptIds([]);
      setSelectedSettingIds([]);
      setSelectedEventIds([]);
    }
  }, [isOpen]);

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

  const togglePrompt = (id: string) => {
    setSelectedPromptIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
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

  const handleConfirm = () => {
    onConfirm({
      selectedCharacterIds,
      selectedLocationIds,
      selectedPromptIds,
      selectedSettingIds,
      selectedEventIds,
    });
  };

  if (!timelineItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>生成Timeline节点内容</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Timeline节点信息 */}
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm font-medium text-purple-900">目标节点:</p>
            <p className="text-sm text-purple-700 mt-1">{timelineItem.content}</p>
          </div>

          {/* 人物卡片 */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              人物卡片
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
              {allCharacters.map(character => (
                <div key={character.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`char-${character.id}`}
                    checked={selectedCharacterIds.includes(character.id)}
                    onCheckedChange={() => toggleCharacter(character.id)}
                  />
                  <label
                    htmlFor={`char-${character.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {character.name}
                  </label>
                </div>
              ))}
              {allCharacters.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">暂无人物卡片</p>
              )}
            </div>
          </div>

          {/* 地点卡片 */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4" />
              地点卡片
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
              {allLocations.map(location => (
                <div key={location.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`loc-${location.id}`}
                    checked={selectedLocationIds.includes(location.id)}
                    onCheckedChange={() => toggleLocation(location.id)}
                  />
                  <label
                    htmlFor={`loc-${location.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {location.name}
                  </label>
                </div>
              ))}
              {allLocations.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">暂无地点卡片</p>
              )}
            </div>
          </div>

          {/* Prompt卡片 */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4" />
              Prompt卡片
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
              {allPrompts.map(prompt => (
                <div key={prompt.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`prompt-${prompt.id}`}
                    checked={selectedPromptIds.includes(prompt.id)}
                    onCheckedChange={() => togglePrompt(prompt.id)}
                  />
                  <label
                    htmlFor={`prompt-${prompt.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {prompt.name}
                  </label>
                </div>
              ))}
              {allPrompts.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">暂无Prompt卡片</p>
              )}
            </div>
          </div>

          {/* 设定卡片 */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4" />
              设定卡片
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
              {allSettings.map(setting => (
                <div key={setting.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`setting-${setting.id}`}
                    checked={selectedSettingIds.includes(setting.id)}
                    onCheckedChange={() => toggleSetting(setting.id)}
                    className="mt-1"
                  />
                  <label
                    htmlFor={`setting-${setting.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    <span>{setting.name}</span>
                    <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                      {setting.category}
                    </span>
                  </label>
                </div>
              ))}
              {allSettings.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">暂无设定卡片</p>
              )}
            </div>
          </div>

          {/* 事件卡片 */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              事件卡片
            </Label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
              {allEvents.map(event => (
                <div key={event.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`event-${event.id}`}
                    checked={selectedEventIds.includes(event.id)}
                    onCheckedChange={() => toggleEvent(event.id)}
                    className="mt-1"
                  />
                  <label
                    htmlFor={`event-${event.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    <div>{event.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{event.outline}</div>
                  </label>
                </div>
              ))}
              {allEvents.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">暂无事件卡片</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确认生成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

