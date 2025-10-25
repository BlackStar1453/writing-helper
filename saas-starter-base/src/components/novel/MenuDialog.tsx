/**
 * Menu卡片创建/编辑对话框
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MenuCard } from '@/lib/novel/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePrompts } from '@/lib/novel/hooks/use-prompts';
import { useCharacters } from '@/lib/novel/hooks/use-characters';
import { useNovels } from '@/lib/novel/hooks/use-novels';

interface MenuDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<MenuCard>) => Promise<void>;
  menu?: MenuCard | null;
}

export function MenuDialog({ isOpen, onClose, onSave, menu }: MenuDialogProps) {
  const { currentNovelId } = useNovels();
  const { prompts } = usePrompts(currentNovelId);
  const { characters } = useCharacters(currentNovelId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [order, setOrder] = useState(0);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (menu) {
      setName(menu.name);
      setDescription(menu.description);
      setPromptTemplate(menu.promptTemplate);
      setEnabled(menu.enabled);
      setOrder(menu.order);
      setSelectedPromptIds(menu.promptCardIds || []);
      setSelectedCharacterIds(menu.characterIds || []);
    } else {
      setName('');
      setDescription('');
      setPromptTemplate('');
      setEnabled(true);
      setOrder(0);
      setSelectedPromptIds([]);
      setSelectedCharacterIds([]);
    }
  }, [menu, isOpen]);

  const handleSave = async () => {
    if (!name.trim() || !promptTemplate.trim()) {
      alert('请填写菜单名称和Prompt模板');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        promptTemplate: promptTemplate.trim(),
        enabled,
        order,
        promptCardIds: selectedPromptIds,
        characterIds: selectedCharacterIds,
      });
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  const togglePromptSelection = (promptId: string) => {
    setSelectedPromptIds(prev =>
      prev.includes(promptId)
        ? prev.filter(id => id !== promptId)
        : [...prev, promptId]
    );
  };

  const toggleCharacterSelection = (characterId: string) => {
    setSelectedCharacterIds(prev =>
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{menu ? '编辑Menu卡片' : '创建Menu卡片'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">菜单名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 使用更好的词汇"
            />
          </div>

          <div>
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如: 根据上下文将选中文本替换为更合适的表达"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="promptTemplate">Prompt模板 *</Label>
            <Textarea
              id="promptTemplate"
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              placeholder="例如: 请根据上下文【{{context}}】将【{{selectedText}}】替换为更合适的表达"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 可以使用 {`{{selectedText}}`} 和 {`{{context}}`} 作为占位符
            </p>
          </div>

          <div>
            <Label>关联Prompt卡片 (可选)</Label>
            <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 space-y-1">
              {prompts.length === 0 ? (
                <p className="text-sm text-gray-500">暂无Prompt卡片</p>
              ) : (
                prompts.map(prompt => (
                  <div key={prompt.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`prompt-${prompt.id}`}
                      checked={selectedPromptIds.includes(prompt.id)}
                      onChange={() => togglePromptSelection(prompt.id)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`prompt-${prompt.id}`} className="cursor-pointer text-sm">
                      {prompt.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 选中的Prompt卡片会作为上下文传递给AI
            </p>
          </div>

          <div>
            <Label>关联人物卡片 (可选)</Label>
            <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 space-y-1">
              {characters.length === 0 ? (
                <p className="text-sm text-gray-500">暂无人物卡片</p>
              ) : (
                characters.map(character => (
                  <div key={character.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`character-${character.id}`}
                      checked={selectedCharacterIds.includes(character.id)}
                      onChange={() => toggleCharacterSelection(character.id)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={`character-${character.id}`} className="cursor-pointer text-sm">
                      {character.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 选中的人物卡片会作为上下文传递给AI
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="enabled" className="cursor-pointer">启用该菜单项</Label>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="order">显示顺序:</Label>
              <Input
                id="order"
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                className="w-20"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

