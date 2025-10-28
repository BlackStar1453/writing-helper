/**
 * 生成初稿设置Modal
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Chapter, Character, Location, SettingCard, EventCard, ChapterTimelineItem, PromptCard } from '@/lib/novel/types';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { usePrompts } from '@/lib/novel/hooks/use-prompts';

export interface GenerateDraftSettings {
  referenceChapters: Chapter[]; // 参考章节
  selectedCharacters: Character[]; // 选中的人物
  selectedLocations: Location[]; // 选中的地点
  selectedSettings: SettingCard[]; // 选中的设定卡片
  selectedEvents: EventCard[]; // 选中的事件卡片
  selectedPrompts: PromptCard[]; // 选中的Prompt卡片
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
  allEvents: EventCard[]; // 所有事件卡片
  currentChapterId: string; // 当前章节ID
  initialSettings?: Partial<GenerateDraftSettings>; // 初始设置
  onConfirm: (settings: GenerateDraftSettings, timeline: ChapterTimelineItem[]) => void; // 确认生成初稿回调
  onGenerateTimeline: (settings: GenerateDraftSettings) => Promise<ChapterTimelineItem[]>; // 生成Timeline回调
  isGeneratingTimeline?: boolean; // 是否正在生成Timeline
  initialTimeline?: ChapterTimelineItem[]; // 初始timeline
}

export function GenerateDraftSettingsModal({
  open,
  onOpenChange,
  allChapters,
  allCharacters,
  allLocations,
  allSettings,
  allEvents,
  currentChapterId,
  initialSettings,
  onConfirm,
  onGenerateTimeline,
  isGeneratingTimeline = false,
  initialTimeline = [],
}: GenerateDraftSettingsModalProps) {
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedSettingIds, setSelectedSettingIds] = useState<string[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [plotSummary, setPlotSummary] = useState('');
  const [chapterPrompt, setChapterPrompt] = useState('');
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [timeline, setTimeline] = useState<ChapterTimelineItem[]>(initialTimeline);
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);
  const [editingTimelineContent, setEditingTimelineContent] = useState('');

  // 获取novelId - 从当前章节或第一个章节中获取
  const currentChapter = allChapters.find(c => c.id === currentChapterId);
  const novelId = currentChapter?.novelId || (allChapters.length > 0 ? allChapters[0].novelId : '');

  // 获取Prompt卡片
  const { prompts } = usePrompts(novelId);

  // 初始化设置
  useEffect(() => {
    if (initialSettings) {
      setSelectedChapterIds(initialSettings.referenceChapters?.map(c => c.id) || []);
      setSelectedCharacterIds(initialSettings.selectedCharacters?.map(c => c.id) || []);
      setSelectedLocationIds(initialSettings.selectedLocations?.map(l => l.id) || []);
      setSelectedSettingIds(initialSettings.selectedSettings?.map(s => s.id) || []);
      setSelectedEventIds(initialSettings.selectedEvents?.map(e => e.id) || []);
      setSelectedPromptIds(initialSettings.selectedPrompts?.map(p => p.id) || []);
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

  // 切换事件选择
  const toggleEvent = (eventId: string) => {
    setSelectedEventIds(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  // 切换Prompt选择
  const togglePrompt = (promptId: string) => {
    setSelectedPromptIds(prev =>
      prev.includes(promptId)
        ? prev.filter(id => id !== promptId)
        : [...prev, promptId]
    );
  };

  // 构建设置对象
  const buildSettings = (): GenerateDraftSettings => {
    return {
      referenceChapters: allChapters.filter(c => selectedChapterIds.includes(c.id)),
      selectedCharacters: allCharacters.filter(c => selectedCharacterIds.includes(c.id)),
      selectedLocations: allLocations.filter(l => selectedLocationIds.includes(l.id)),
      selectedSettings: allSettings.filter(s => selectedSettingIds.includes(s.id)),
      selectedEvents: allEvents.filter(e => selectedEventIds.includes(e.id)),
      selectedPrompts: prompts.filter(p => selectedPromptIds.includes(p.id)),
      plotSummary,
      chapterPrompt,
      globalPrompt,
    };
  };

  // 生成Timeline
  const handleGenerateTimeline = async () => {
    const settings = buildSettings();
    const generatedTimeline = await onGenerateTimeline(settings);
    setTimeline(generatedTimeline);
  };

  // 编辑Timeline节点
  const handleEditTimeline = (item: ChapterTimelineItem) => {
    setEditingTimelineId(item.id);
    setEditingTimelineContent(item.content);
  };

  // 保存Timeline编辑
  const handleSaveTimelineEdit = () => {
    if (!editingTimelineId) return;
    setTimeline(prev =>
      prev.map(item =>
        item.id === editingTimelineId
          ? { ...item, content: editingTimelineContent }
          : item
      )
    );
    setEditingTimelineId(null);
    setEditingTimelineContent('');
  };

  // 取消Timeline编辑
  const handleCancelTimelineEdit = () => {
    setEditingTimelineId(null);
    setEditingTimelineContent('');
  };

  // 删除Timeline节点
  const handleDeleteTimeline = (id: string) => {
    setTimeline(prev => prev.filter(item => item.id !== id));
  };

  // 确认生成初稿
  const handleConfirm = () => {
    const settings = buildSettings();
    onConfirm(settings, timeline);
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

          {/* 事件卡片 */}
          <div>
            <Label className="text-lg font-semibold mb-2 block">事件卡片</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {allEvents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">暂无事件卡片</p>
              ) : (
                allEvents.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-start gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEventIds.includes(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{event.name}</div>
                      {event.outline && (
                        <span className="text-xs text-gray-500 line-clamp-1">
                          {event.outline}
                        </span>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Prompt卡片选择 */}
          <div>
            <Label className="text-lg font-semibold mb-2 block">
              写作风格 (可选)
            </Label>
            <p className="text-sm text-gray-600 mb-3">选择Prompt卡片来指定生成初稿的语言风格</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
              {prompts.length === 0 ? (
                <div className="text-sm text-gray-500 font-light">
                  暂无Prompt卡片,可在Prompt管理页面创建
                </div>
              ) : (
                prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => togglePrompt(prompt.id)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      selectedPromptIds.includes(prompt.id)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    title={prompt.description}
                  >
                    {prompt.name}
                  </button>
                ))
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-light">
              如果不选择Prompt卡片,将使用与上下文统一的语言风格
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

          {/* Timeline显示区域 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-lg font-semibold">时间线</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateTimeline}
                disabled={isGeneratingTimeline}
              >
                {isGeneratingTimeline ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  '生成Timeline'
                )}
              </Button>
            </div>
            <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto">
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  暂无时间线，点击"生成Timeline"按钮生成
                </p>
              ) : (
                timeline.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100"
                  >
                    <span className="text-sm font-medium text-gray-500 min-w-[2rem]">
                      {item.order}.
                    </span>
                    {editingTimelineId === item.id ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <textarea
                          value={editingTimelineContent}
                          onChange={(e) => setEditingTimelineContent(e.target.value)}
                          className="flex-1 p-2 text-sm border rounded resize-none"
                          rows={4}
                          placeholder="描述这个时间线节点的内容..."
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">目标字数:</label>
                          <select
                            value={item.targetWordCount || 500}
                            onChange={(e) => {
                              const newTimeline = timeline.map(t =>
                                t.id === item.id
                                  ? { ...t, targetWordCount: parseInt(e.target.value) }
                                  : t
                              );
                              setTimeline(newTimeline);
                            }}
                            className="text-xs border rounded px-2 py-1"
                          >
                            <option value="200">简短 (200字)</option>
                            <option value="500">中等 (500字)</option>
                            <option value="800">详细 (800字)</option>
                            <option value="1200">很详细 (1200字)</option>
                          </select>
                          <div className="flex gap-1 ml-auto">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleSaveTimelineEdit}
                              className="h-6 px-2"
                            >
                              保存
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelTimelineEdit}
                              className="h-6 px-2"
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="text-sm">{item.content}</span>
                          {item.targetWordCount && (
                            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              ~{item.targetWordCount}字
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditTimeline(item)}
                            className="h-6 w-6 p-0"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTimeline(item.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
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
          <Button onClick={handleConfirm}>
            生成初稿
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

