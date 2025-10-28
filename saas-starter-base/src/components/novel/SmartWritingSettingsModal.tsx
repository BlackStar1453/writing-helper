/**
 * 智能续写/重写设置Modal
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Character, Location, SettingCard, ChapterTimelineItem, NovelContext, PromptCard } from '@/lib/novel/types';
import { Loader2 } from 'lucide-react';
import { usePrompts } from '@/lib/novel/hooks/use-prompts';

export interface SmartWritingSettings {
  // 续写设置
  length?: 'short' | 'medium' | 'long';

  // 重写设置
  rewriteStyle?: 'vivid' | 'concise' | 'formal' | 'casual' | 'emotional' | 'character-based';

  // 通用设置
  selectedCharacters: Character[];
  selectedLocations: Location[];
  selectedSettings: SettingCard[];
  selectedPrompts: PromptCard[];  // 新增: 选中的Prompt卡片
  useTimeline: boolean;
  currentTimelineNode?: ChapterTimelineItem;
  customPrompt?: string;
}

interface SmartWritingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'continue' | 'rewrite';
  selectedText: string;
  onGenerate: (settings: SmartWritingSettings) => Promise<void>;
  novelContext: NovelContext;
  allCharacters: Character[];
  allLocations: Location[];
  allSettings: SettingCard[];
  currentTimelineNode?: ChapterTimelineItem;
  isGenerating?: boolean;
}

export function SmartWritingSettingsModal({
  isOpen,
  onClose,
  mode,
  selectedText,
  onGenerate,
  novelContext,
  allCharacters,
  allLocations,
  allSettings,
  currentTimelineNode,
  isGenerating = false,
}: SmartWritingSettingsModalProps) {
  // 加载Prompt卡片
  const { prompts } = usePrompts(novelContext.novelId);

  // 默认设置
  const getDefaultSettings = (): SmartWritingSettings => {
    if (mode === 'continue') {
      return {
        length: 'medium',
        selectedCharacters: novelContext.selectedCharacters || [],
        selectedLocations: novelContext.selectedLocations || [],
        selectedSettings: [],
        selectedPrompts: [],
        useTimeline: true,
        currentTimelineNode,
        customPrompt: '',
      };
    } else {
      return {
        selectedCharacters: novelContext.selectedCharacters || [],
        selectedLocations: novelContext.selectedLocations || [],
        selectedSettings: [],
        selectedPrompts: [],
        useTimeline: false,
        customPrompt: '',
      };
    }
  };

  const [settings, setSettings] = useState<SmartWritingSettings>(getDefaultSettings());

  // 重置设置当modal打开时
  useEffect(() => {
    if (isOpen) {
      setSettings(getDefaultSettings());
    }
  }, [isOpen, mode]);

  // 切换人物选择
  const toggleCharacter = (characterId: string) => {
    setSettings(prev => {
      const isSelected = prev.selectedCharacters.some(c => c.id === characterId);
      if (isSelected) {
        return {
          ...prev,
          selectedCharacters: prev.selectedCharacters.filter(c => c.id !== characterId)
        };
      } else {
        const character = allCharacters.find(c => c.id === characterId);
        if (character) {
          return {
            ...prev,
            selectedCharacters: [...prev.selectedCharacters, character]
          };
        }
        return prev;
      }
    });
  };

  // 切换地点选择
  const toggleLocation = (locationId: string) => {
    setSettings(prev => {
      const isSelected = prev.selectedLocations.some(l => l.id === locationId);
      if (isSelected) {
        return {
          ...prev,
          selectedLocations: prev.selectedLocations.filter(l => l.id !== locationId)
        };
      } else {
        const location = allLocations.find(l => l.id === locationId);
        if (location) {
          return {
            ...prev,
            selectedLocations: [...prev.selectedLocations, location]
          };
        }
        return prev;
      }
    });
  };

  // 切换Prompt选择
  const togglePrompt = (promptId: string) => {
    setSettings(prev => {
      const isSelected = prev.selectedPrompts.some(p => p.id === promptId);
      if (isSelected) {
        return {
          ...prev,
          selectedPrompts: prev.selectedPrompts.filter(p => p.id !== promptId)
        };
      } else {
        const prompt = prompts.find(p => p.id === promptId);
        if (prompt) {
          return {
            ...prev,
            selectedPrompts: [...prev.selectedPrompts, prompt]
          };
        }
        return prev;
      }
    });
  };

  // 切换设定选择
  const toggleSetting = (settingId: string) => {
    setSettings(prev => {
      const isSelected = prev.selectedSettings.some(s => s.id === settingId);
      if (isSelected) {
        return {
          ...prev,
          selectedSettings: prev.selectedSettings.filter(s => s.id !== settingId)
        };
      } else {
        const setting = allSettings.find(s => s.id === settingId);
        if (setting) {
          return {
            ...prev,
            selectedSettings: [...prev.selectedSettings, setting]
          };
        }
        return prev;
      }
    });
  };

  // 处理生成（使用默认设置）
  const handleGenerateWithDefault = async () => {
    const defaultSettings = getDefaultSettings();
    await onGenerate(defaultSettings);
  };

  // 处理生成（使用自定义设置）
  const handleGenerateWithCustom = async () => {
    await onGenerate(settings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-light">
            {mode === 'continue' ? '智能续写设置' : '段落重写设置'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 选中的文本预览 */}
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 mb-1 font-light">选中的文本:</div>
            <div className="text-sm text-gray-700 dark:text-gray-300 max-h-24 overflow-y-auto font-light">
              {selectedText.length > 200 ? selectedText.substring(0, 200) + '...' : selectedText}
            </div>
          </div>

          {/* 续写长度 */}
          {mode === 'continue' && (
            <div>
              <Label className="text-sm font-light mb-2 block">续写长度</Label>
              <div className="flex gap-2">
                {(['short', 'medium', 'long'] as const).map((len) => (
                  <button
                    key={len}
                    onClick={() => setSettings(prev => ({ ...prev, length: len }))}
                    className={`px-4 py-2 text-sm font-light rounded border transition-colors ${
                      settings.length === len
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                    }`}
                  >
                    {len === 'short' && '短（100-200字）'}
                    {len === 'medium' && '中（200-500字）'}
                    {len === 'long' && '长（500-1000字）'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt卡片选择 (用于风格设置) */}
          <div>
            <Label className="text-sm font-light mb-2 block">
              {mode === 'continue' ? '续写风格 (可选)' : '重写风格 (可选)'}
            </Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
              {prompts.length === 0 ? (
                <div className="text-sm text-gray-500 font-light">
                  暂无Prompt卡片,可在Prompt管理页面创建
                </div>
              ) : (
                prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => togglePrompt(prompt.id)}
                    className={`px-3 py-1 text-sm font-light rounded border transition-colors ${
                      settings.selectedPrompts.some(p => p.id === prompt.id)
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
                    }`}
                    title={prompt.description}
                  >
                    {prompt.name}
                  </button>
                ))
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-light">
              {mode === 'continue'
                ? '选择Prompt卡片来指定续写的语言风格,如果不选择则使用与上下文统一的语言风格'
                : '选择Prompt卡片来指定重写的语言风格,如果不选择则使用与上下文统一的语言风格'
              }
            </div>
          </div>

          {/* 人物选择 */}
          <div>
            <Label className="text-sm font-light mb-2 block">相关人物</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
              {allCharacters.length === 0 ? (
                <div className="text-sm text-gray-500 font-light">暂无人物</div>
              ) : (
                allCharacters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => toggleCharacter(char.id)}
                    className={`px-3 py-1 text-sm font-light rounded border transition-colors ${
                      settings.selectedCharacters.some(c => c.id === char.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                    }`}
                  >
                    {char.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 地点选择 */}
          <div>
            <Label className="text-sm font-light mb-2 block">相关地点</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
              {allLocations.length === 0 ? (
                <div className="text-sm text-gray-500 font-light">暂无地点</div>
              ) : (
                allLocations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => toggleLocation(loc.id)}
                    className={`px-3 py-1 text-sm font-light rounded border transition-colors ${
                      settings.selectedLocations.some(l => l.id === loc.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                    }`}
                  >
                    {loc.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 设定选择 */}
          <div>
            <Label className="text-sm font-light mb-2 block">世界设定</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
              {allSettings.length === 0 ? (
                <div className="text-sm text-gray-500 font-light">暂无设定</div>
              ) : (
                allSettings.map((setting) => (
                  <button
                    key={setting.id}
                    onClick={() => toggleSetting(setting.id)}
                    className={`px-3 py-1 text-sm font-light rounded border transition-colors ${
                      settings.selectedSettings.some(s => s.id === setting.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                    }`}
                  >
                    {setting.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Timeline选项 */}
          {mode === 'continue' && (
            <div>
              <Label className="flex items-center gap-2 text-sm font-light cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useTimeline}
                  onChange={(e) => setSettings(prev => ({ ...prev, useTimeline: e.target.checked }))}
                  className="rounded"
                />
                基于Timeline生成
              </Label>
              {settings.useTimeline && currentTimelineNode && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-light">
                  当前节点: {currentTimelineNode.content}
                </div>
              )}
            </div>
          )}

          {/* 自定义提示词 */}
          <div>
            <Label className="text-sm font-light mb-2 block">自定义提示词（可选）</Label>
            <Textarea
              value={settings.customPrompt || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, customPrompt: e.target.value }))}
              placeholder="输入额外的生成要求..."
              className="min-h-[80px] font-light text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
            className="font-light"
          >
            取消
          </Button>
          <Button
            onClick={handleGenerateWithDefault}
            disabled={isGenerating}
            className="bg-blue-500 hover:bg-blue-600 text-white font-light"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              '使用默认设置生成'
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={handleGenerateWithCustom}
            disabled={isGenerating}
            className="font-light"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              '自定义生成'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

