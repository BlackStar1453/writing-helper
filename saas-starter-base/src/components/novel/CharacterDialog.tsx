/**
 * 人物创建/编辑对话框
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Character } from '@/lib/novel/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CharacterDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Character>) => Promise<void>;
  character?: Character | null;
}

export function CharacterDialog({ open, onClose, onSave, character }: CharacterDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    description: '',
    appearance: '',
    personality: '',
    characterArc: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name || '',
        avatar: character.avatar || '',
        description: character.basicInfo.description || '',
        appearance: character.basicInfo.appearance || '',
        personality: character.basicInfo.personality || '',
        characterArc: character.basicInfo.characterArc || ''
      });
    } else {
      setFormData({
        name: '',
        avatar: '',
        description: '',
        appearance: '',
        personality: '',
        characterArc: ''
      });
    }
  }, [character, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data: Partial<Character> = {
        name: formData.name,
        avatar: formData.avatar || undefined,
        basicInfo: {
          description: formData.description || undefined,
          appearance: formData.appearance || undefined,
          personality: formData.personality || undefined,
          characterArc: formData.characterArc || undefined
        }
      };

      if (character) {
        data.id = character.id;
      }

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save character:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{character ? '编辑人物' : '创建人物'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="avatar">头像 URL</Label>
            <Input
              id="avatar"
              type="url"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="description">基本信息</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="包含年龄、性别、职业等基本信息..."
            />
          </div>

          <div>
            <Label htmlFor="appearance">外貌描述</Label>
            <Textarea
              id="appearance"
              value={formData.appearance}
              onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
              rows={3}
              placeholder="描述人物的外貌特征..."
            />
          </div>

          <div>
            <Label htmlFor="personality">性格描述</Label>
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              rows={3}
              placeholder="描述人物的性格特点..."
            />
          </div>

          <div>
            <Label htmlFor="characterArc">人物弧光</Label>
            <Textarea
              id="characterArc"
              value={formData.characterArc}
              onChange={(e) => setFormData({ ...formData, characterArc: e.target.value })}
              rows={3}
              placeholder="描述人物的成长轨迹和变化..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={saving || !formData.name}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

