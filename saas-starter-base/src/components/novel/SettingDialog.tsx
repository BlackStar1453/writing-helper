/**
 * 设定卡片创建/编辑对话框
 */

'use client';

import React, { useState, useEffect } from 'react';
import { SettingCard } from '@/lib/novel/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SettingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SettingCard>) => Promise<void>;
  setting?: SettingCard | null;
}

const CATEGORIES = [
  '世界设定',
  '背景设定',
  '功能设定',
  '魔法系统',
  '科技设定',
  '社会设定',
  '其他',
];

export function SettingDialog({ isOpen, onClose, onSave, setting }: SettingDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('世界设定');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (setting) {
      setName(setting.name);
      setCategory(setting.category);
      setDescription(setting.description);
    } else {
      setName('');
      setCategory('世界设定');
      setDescription('');
    }
  }, [setting, isOpen]);

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      alert('请填写设定名称和描述');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{setting ? '编辑设定卡片' : '创建设定卡片'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">设定名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 魔法系统、世界观、科技水平"
            />
          </div>

          <div>
            <Label htmlFor="category">设定分类 *</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="description">设定描述 *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="详细描述这个设定的内容,例如魔法系统的规则、世界观的背景等"
              rows={8}
              className="resize-y"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 详细的设定描述有助于AI生成更符合设定的内容
            </p>
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

