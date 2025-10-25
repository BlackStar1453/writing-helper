/**
 * 小说上下文面板组件
 */

'use client';

import React from 'react';
import { NovelContext, Character, Location, PromptCard, SettingCard } from '@/lib/novel/types';
import { useCharacters } from '@/lib/novel/hooks/use-characters';
import { useLocations } from '@/lib/novel/hooks/use-locations';
import { usePrompts } from '@/lib/novel/hooks/use-prompts';
import { useSettings } from '@/lib/novel/hooks/use-settings';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, User, MapPin, Sparkles, Settings } from 'lucide-react';

interface NovelContextPanelProps {
  context: NovelContext;
  onChange: (context: NovelContext) => void;
}

export function NovelContextPanel({ context, onChange }: NovelContextPanelProps) {
  const { currentNovelId } = useNovels();
  const { characters } = useCharacters(currentNovelId);
  const { locations } = useLocations(currentNovelId);
  const { prompts } = usePrompts(currentNovelId);
  const { settings } = useSettings(currentNovelId);

  const [showCharacterSelect, setShowCharacterSelect] = React.useState(false);
  const [showLocationSelect, setShowLocationSelect] = React.useState(false);
  const [showPromptSelect, setShowPromptSelect] = React.useState(false);
  const [showSettingSelect, setShowSettingSelect] = React.useState(false);

  const selectedCharacterIds = context.selectedCharacters?.map(c => c.id) || [];
  const selectedLocationIds = context.selectedLocations?.map(l => l.id) || [];
  const selectedPromptIds = context.selectedPrompts?.map(p => p.id) || [];
  const selectedSettingIds = context.selectedSettings?.map(s => s.id) || [];

  const handleAddCharacter = (character: Character) => {
    if (!selectedCharacterIds.includes(character.id)) {
      onChange({
        ...context,
        selectedCharacters: [...(context.selectedCharacters || []), character]
      });
    }
    setShowCharacterSelect(false);
  };

  const handleRemoveCharacter = (characterId: string) => {
    onChange({
      ...context,
      selectedCharacters: context.selectedCharacters?.filter(c => c.id !== characterId)
    });
  };

  const handleAddLocation = (location: Location) => {
    if (!selectedLocationIds.includes(location.id)) {
      onChange({
        ...context,
        selectedLocations: [...(context.selectedLocations || []), location]
      });
    }
    setShowLocationSelect(false);
  };

  const handleRemoveLocation = (locationId: string) => {
    onChange({
      ...context,
      selectedLocations: context.selectedLocations?.filter(l => l.id !== locationId)
    });
  };

  const handleAddPrompt = (prompt: PromptCard) => {
    if (!selectedPromptIds.includes(prompt.id)) {
      onChange({
        ...context,
        selectedPrompts: [...(context.selectedPrompts || []), prompt]
      });
    }
    setShowPromptSelect(false);
  };

  const handleRemovePrompt = (promptId: string) => {
    onChange({
      ...context,
      selectedPrompts: context.selectedPrompts?.filter(p => p.id !== promptId)
    });
  };

  const handleAddSetting = (setting: SettingCard) => {
    if (!selectedSettingIds.includes(setting.id)) {
      onChange({
        ...context,
        selectedSettings: [...(context.selectedSettings || []), setting]
      });
    }
    setShowSettingSelect(false);
  };

  const handleRemoveSetting = (settingId: string) => {
    onChange({
      ...context,
      selectedSettings: context.selectedSettings?.filter(s => s.id !== settingId)
    });
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* 章节信息 */}
      {context.chapterInfo && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-sm mb-2">章节信息</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {context.chapterInfo.volume} &gt; {context.chapterInfo.chapter} &gt; {context.chapterInfo.section}
          </p>
          <p className="text-sm font-medium mt-1">{context.chapterInfo.title}</p>
        </div>
      )}

      {/* 关联人物 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            关联人物
          </Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCharacterSelect(!showCharacterSelect)}
          >
            添加
          </Button>
        </div>

        {showCharacterSelect && (
          <div className="mb-3 p-2 border rounded-lg max-h-48 overflow-y-auto">
            {characters.filter(c => !selectedCharacterIds.includes(c.id)).map(character => (
              <button
                key={character.id}
                onClick={() => handleAddCharacter(character)}
                className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <div className="font-medium text-sm">{character.name}</div>
                {character.basicInfo.description && (
                  <div className="text-xs text-gray-500 line-clamp-1">
                    {character.basicInfo.description}
                  </div>
                )}
              </button>
            ))}
            {characters.filter(c => !selectedCharacterIds.includes(c.id)).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">没有更多人物</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {context.selectedCharacters?.map(character => (
            <div
              key={character.id}
              className="flex items-start justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{character.name}</div>
                {character.basicInfo.description && (
                  <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {character.basicInfo.description}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveCharacter(character.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!context.selectedCharacters || context.selectedCharacters.length === 0) && (
            <p className="text-sm text-gray-500">未选择人物</p>
          )}
        </div>
      </div>

      {/* 关联地点 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            关联地点
          </Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLocationSelect(!showLocationSelect)}
          >
            添加
          </Button>
        </div>

        {showLocationSelect && (
          <div className="mb-3 p-2 border rounded-lg max-h-48 overflow-y-auto">
            {locations.filter(l => !selectedLocationIds.includes(l.id)).map(location => (
              <button
                key={location.id}
                onClick={() => handleAddLocation(location)}
                className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <div className="font-medium text-sm">{location.name}</div>
                {location.description && (
                  <div className="text-xs text-gray-500 line-clamp-1">
                    {location.description}
                  </div>
                )}
              </button>
            ))}
            {locations.filter(l => !selectedLocationIds.includes(l.id)).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">没有更多地点</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {context.selectedLocations?.map(location => (
            <div
              key={location.id}
              className="flex items-start justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{location.name}</div>
                {location.description && (
                  <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {location.description}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveLocation(location.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!context.selectedLocations || context.selectedLocations.length === 0) && (
            <p className="text-sm text-gray-500">未选择地点</p>
          )}
        </div>
      </div>

      {/* 关联Prompt卡片 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Prompt卡片
          </Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPromptSelect(!showPromptSelect)}
          >
            添加
          </Button>
        </div>

        {showPromptSelect && (
          <div className="mb-3 p-2 border rounded-lg max-h-48 overflow-y-auto">
            {prompts.filter(p => !selectedPromptIds.includes(p.id)).map(prompt => (
              <button
                key={prompt.id}
                onClick={() => handleAddPrompt(prompt)}
                className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <div className="font-medium text-sm">{prompt.name}</div>
                {prompt.description && (
                  <div className="text-xs text-gray-500 line-clamp-1">
                    {prompt.description}
                  </div>
                )}
              </button>
            ))}
            {prompts.filter(p => !selectedPromptIds.includes(p.id)).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">没有更多Prompt卡片</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {context.selectedPrompts?.map(prompt => (
            <div
              key={prompt.id}
              className="flex items-start justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{prompt.name}</div>
                {prompt.description && (
                  <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {prompt.description}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemovePrompt(prompt.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!context.selectedPrompts || context.selectedPrompts.length === 0) && (
            <p className="text-sm text-gray-500">未选择Prompt卡片</p>
          )}
        </div>
      </div>

      {/* 情节概括 */}
      <div>
        <Label htmlFor="plotSummary">情节概括</Label>
        <Textarea
          id="plotSummary"
          value={context.plotSummary || ''}
          onChange={(e) => onChange({ ...context, plotSummary: e.target.value })}
          rows={3}
          placeholder="简要描述本章节的主要情节..."
        />
      </div>

      {/* Prompt 设定 */}
      <div>
        <Label htmlFor="globalPrompt">全局 Prompt</Label>
        <Textarea
          id="globalPrompt"
          value={context.globalPrompt || ''}
          onChange={(e) => onChange({ ...context, globalPrompt: e.target.value })}
          rows={3}
          placeholder="例如: 使用第一人称视角,注重心理描写..."
        />
      </div>

      <div>
        <Label htmlFor="chapterPrompt">章节 Prompt</Label>
        <Textarea
          id="chapterPrompt"
          value={context.chapterPrompt || ''}
          onChange={(e) => onChange({ ...context, chapterPrompt: e.target.value })}
          rows={3}
          placeholder="本章节的特殊要求..."
        />
      </div>
    </div>
  );
}

