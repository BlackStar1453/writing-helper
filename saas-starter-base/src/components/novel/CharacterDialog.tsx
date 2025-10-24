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
    age: '',
    gender: '',
    occupation: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name || '',
        avatar: character.avatar || '',
        age: character.basicInfo.age?.toString() || '',
        gender: character.basicInfo.gender || '',
        occupation: character.basicInfo.occupation || '',
        description: character.basicInfo.description || ''
      });
    } else {
      setFormData({
        name: '',
        avatar: '',
        age: '',
        gender: '',
        occupation: '',
        description: ''
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
          age: formData.age ? parseInt(formData.age) : undefined,
          gender: formData.gender || undefined,
          occupation: formData.occupation || undefined,
          description: formData.description || undefined
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age">年龄</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="gender">性别</Label>
              <Input
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="occupation">职业</Label>
            <Input
              id="occupation"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
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

