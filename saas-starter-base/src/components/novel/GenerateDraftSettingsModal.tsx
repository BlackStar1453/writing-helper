/**
 * 生成初稿设置Modal
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Chapter, Character, Location, SettingCard } from '@/lib/novel/types';

export interface GenerateDraftSettings {
  referenceChapters: Chapter[]; // 参考章节
  selectedCharacters: Character[]; // 选中的人物
  selectedLocations: Location[]; // 选中的地点
  selectedSettings: SettingCard[]; // 选中的设定卡片
  plotSummary: string; // 情节概括
  chapterPrompt: string; // 章节Prompt
  globalPrompt: string; // 全局Prompt
}

interface GenerateDraftSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allChapters: Chapter[]; // 所有章节
  allCharacters: Character[]; // 所有人物
  allLocations: Location[]; // 所有地点
  allSettings: SettingCard[]; // 所有设定卡片
  currentChapterId: string; // 当前章节ID
  initialSettings?: Partial<GenerateDraftSettings>; // 初始设置
  onConfirm: (settings: GenerateDraftSettings) => void; // 确认生成初稿回调
  onGenerateTimeline: (settings: GenerateDraftSettings) => void; // 生成Timeline回调
  isGeneratingTimeline?: boolean; // 是否正在生成Timeline
}

export function GenerateDraftSettingsModal({
  open,
  onOpenChange,
  allChapters,
  allCharacters,
  allLocations,
  allSettings,
  currentChapterId,
  initialSettings,
  onConfirm,
  onGenerateTimeline,
  isGeneratingTimeline = false,
}: GenerateDraftSettingsModalProps) {
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedSettingIds, setSelectedSettingIds] = useState<string[]>([]);
  const [plotSummary, setPlotSummary] = useState('');
  const [chapterPrompt, setChapterPrompt] = useState('');
  const [globalPrompt, setGlobalPrompt] = useState('');

  // 初始化设置
  useEffect(() => {
    if (initialSettings) {
      setSelectedChapterIds(initialSettings.referenceChapters?.map(c => c.id) || []);
      setSelectedCharacterIds(initialSettings.selectedCharacters?.map(c => c.id) || []);
      setSelectedLocationIds(initialSettings.selectedLocations?.map(l => l.id) || []);
      setSelectedSettingIds(initialSettings.selectedSettings?.map(s => s.id) || []);
      setPlotSummary(initialSettings.plotSummary || '');
      setChapterPrompt(initialSettings.chapterPrompt || '');
      setGlobalPrompt(initialSettings.globalPrompt || '');
    }
  }, [initialSettings, open]);

  // 过滤掉当前章节,只显示其他章节
  const availableChapters = allChapters.filter(c => c.id !== currentChapterId);

  // 切换章节选择
  const toggleChapter = (chapterId: string) => {
    setSelectedChapterIds(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  // 切换人物选择
  const toggleCharacter = (characterId: string) => {
    setSelectedCharacterIds(prev =>
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  // 切换地点选择
  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  // 切换设定选择
  const toggleSetting = (settingId: string) => {
    setSelectedSettingIds(prev =>
      prev.includes(settingId)
        ? prev.filter(id => id !== settingId)
        : [...prev, settingId]
    );
  };

  // 构建设置对象
  const buildSettings = (): GenerateDraftSettings => {
    return {
      referenceChapters: allChapters.filter(c => selectedChapterIds.includes(c.id)),
      selectedCharacters: allCharacters.filter(c => selectedCharacterIds.includes(c.id)),
      selectedLocations: allLocations.filter(l => selectedLocationIds.includes(l.id)),
      selectedSettings: allSettings.filter(s => selectedSettingIds.includes(s.id)),
      plotSummary,
      chapterPrompt,
      globalPrompt,
    };
  };

  // 确认生成初稿
  const handleConfirm = () => {
    const settings = buildSettings();
    onConfirm(settings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">生成初稿设置</h2>

        <div className="space-y-6">
          {/* 参考章节 */}
          <div>
            <Label className="text-lg font-semibold mb-2 block">参考章节</Label>
            <p className="text-sm text-gray-600 mb-3">选择已完成的章节作为上下文参考</p>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {availableChapters.length === 0 ? (
                <p className="text-sm text-gray-500">暂无其他章节</p>
              ) : (
                availableChapters.map(chapter => (
                  <label
                    key={chapter.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChapterIds.includes(chapter.id)}
                      onChange={() => toggleChapter(chapter.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {chapter.volumeId} &gt; {chapter.chapterId} &gt; {chapter.sectionId} - {chapter.title}
                      <span className="text-gray-500 ml-2">
                        ({chapter.content?.length || 0} 字)
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 关联人物 */}
          <div>
            <Label className="text-lg font-semibold mb-2 block">关联人物</Label>
            <p className="text-sm text-gray-600 mb-3">选择本章节涉及的人物</p>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {allCharacters.length === 0 ? (
                <p className="text-sm text-gray-500">暂无人物</p>
              ) : (
                allCharacters.map(character => (
                  <label
                    key={character.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCharacterIds.includes(character.id)}
                      onChange={() => toggleCharacter(character.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {character.name}
                      {character.basicInfo?.description && (
                        <span className="text-gray-500 ml-2">
                          - {character.basicInfo.description.substring(0, 50)}
                          {character.basicInfo.description.length > 50 ? '...' : ''}
                        </span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 关联地点 */}
          <div>
            <Label className="text-lg font-semibold mb-2 block">关联地点</Label>
            <p className="text-sm text-gray-600 mb-3">选择本章节涉及的地点</p>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {allLocations.length === 0 ? (
                <p className="text-sm text-gray-500">暂无地点</p>
              ) : (
                allLocations.map(location => (
                  <label
                    key={location.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLocationIds.includes(location.id)}
                      onChange={() => toggleLocation(location.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {location.name}
                      {location.description && (
                        <span className="text-gray-500 ml-2">
                          - {location.description.substring(0, 50)}
                          {location.description.length > 50 ? '...' : ''}
                        </span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 设定卡片选择 */}
          <div>
            <Label className="text-lg font-semibold mb-2 block">
              设定卡片
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {allSettings.length === 0 ? (
                <p className="text-sm text-gray-500">暂无设定卡片</p>
              ) : (
                allSettings.map(setting => (
                  <label
                    key={setting.id}
                    className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSettingIds.includes(setting.id)}
                      onChange={() => toggleSetting(setting.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{setting.name}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded">
                          {setting.category}
                        </span>
                      </div>
                      {setting.description && (
                        <span className="text-xs text-gray-500 block mt-1">
                          {setting.description.substring(0, 80)}
                          {setting.description.length > 80 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 情节概括 */}
          <div>
            <Label htmlFor="plotSummary" className="text-lg font-semibold mb-2 block">
              情节概括
            </Label>
            <textarea
              id="plotSummary"
              value={plotSummary}
              onChange={(e) => setPlotSummary(e.target.value)}
              className="w-full h-24 p-2 border rounded-md resize-none"
              placeholder="简要描述本章节的主要情节..."
            />
          </div>

          {/* 章节Prompt */}
          <div>
            <Label htmlFor="chapterPrompt" className="text-lg font-semibold mb-2 block">
              章节 Prompt
            </Label>
            <textarea
              id="chapterPrompt"
              value={chapterPrompt}
              onChange={(e) => setChapterPrompt(e.target.value)}
              className="w-full h-24 p-2 border rounded-md resize-none"
              placeholder="针对本章节的特殊要求或风格指导..."
            />
          </div>

          {/* 全局Prompt */}
          <div>
            <Label htmlFor="globalPrompt" className="text-lg font-semibold mb-2 block">
              全局 Prompt
            </Label>
            <textarea
              id="globalPrompt"
              value={globalPrompt}
              onChange={(e) => setGlobalPrompt(e.target.value)}
              className="w-full h-24 p-2 border rounded-md resize-none"
              placeholder="适用于整部小说的写作风格和要求..."
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                const settings = buildSettings();
                onGenerateTimeline(settings);
              }}
              disabled={isGeneratingTimeline}
            >
              {isGeneratingTimeline ? '生成中...' : '生成Timeline'}
            </Button>
            <Button onClick={handleConfirm}>
              生成初稿
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

