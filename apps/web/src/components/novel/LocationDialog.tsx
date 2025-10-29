/**
 * 地点创建/编辑对话框
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Location } from '@/lib/novel/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LocationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Location>) => Promise<void>;
  location?: Location | null;
}

export function LocationDialog({ open, onClose, onSave, location }: LocationDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    type: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        image: location.image || '',
        type: location.type || '',
        description: location.description || ''
      });
    } else {
      setFormData({
        name: '',
        image: '',
        type: '',
        description: ''
      });
    }
  }, [location, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data: Partial<Location> = {
        name: formData.name,
        image: formData.image || undefined,
        type: formData.type || undefined,
        description: formData.description || undefined
      };

      if (location) {
        data.id = location.id;
      }

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save location:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{location ? '编辑地点' : '创建地点'}</DialogTitle>
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
            <Label htmlFor="image">图片 URL</Label>
            <Input
              id="image"
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="type">类型</Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="例如: 城市、建筑、自然景观"
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

