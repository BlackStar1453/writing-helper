/**
 * Prompt卡片创建/编辑对话框
 */

'use client';

import React, { useState, useEffect } from 'react';
import { PromptCard } from '@/lib/novel/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PromptCard>) => Promise<void>;
  prompt?: PromptCard | null;
}

export function PromptDialog({ isOpen, onClose, onSave, prompt }: PromptDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    exampleBefore: '',
    exampleAfter: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name || '',
        description: prompt.description || '',
        exampleBefore: prompt.exampleBefore || '',
        exampleAfter: prompt.exampleAfter || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        exampleBefore: '',
        exampleAfter: '',
      });
    }
  }, [prompt, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('请填写Prompt名称和描述');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Failed to save prompt:', err);
      alert('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{prompt ? '编辑Prompt卡片' : '创建Prompt卡片'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prompt名称 */}
          <div>
            <Label htmlFor="name">Prompt名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: 简洁语言风格"
              required
            />
          </div>

          {/* 操作描述 */}
          <div>
            <Label htmlFor="description">操作描述 *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="例如: 使用更简单的语言,避免复杂句式,多用短句"
              rows={3}
              required
            />
          </div>

          {/* 示例文本(Before) */}
          <div>
            <Label htmlFor="exampleBefore">示例文本(符合描述的文本)</Label>
            <Textarea
              id="exampleBefore"
              value={formData.exampleBefore}
              onChange={(e) => setFormData({ ...formData, exampleBefore: e.target.value })}
              placeholder="提供一个符合上述描述的文本示例..."
              rows={5}
            />
            <p className="text-xs text-gray-500 mt-1">
              这个示例将帮助AI理解什么样的文本是符合要求的
            </p>
          </div>

          {/* 示例文本(After) */}
          <div>
            <Label htmlFor="exampleAfter">生成的文本示例(可选)</Label>
            <Textarea
              id="exampleAfter"
              value={formData.exampleAfter}
              onChange={(e) => setFormData({ ...formData, exampleAfter: e.target.value })}
              placeholder="按照上述示例和操作描述生成的文本..."
              rows={5}
            />
            <p className="text-xs text-gray-500 mt-1">
              生成内容时,AI生成的文本会自动保存到这里
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

