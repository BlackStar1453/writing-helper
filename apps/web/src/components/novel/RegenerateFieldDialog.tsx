/**
 * 重新生成字段对话框
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings } from '@/lib/db-utils';

interface RegenerateFieldDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (newValue: string) => void;
  fieldName: string;
  currentValue: string;
  characterName: string;
}

const fieldLabels: Record<string, string> = {
  description: '基本信息',
  appearance: '外貌描述',
  personality: '性格描述',
  characterArc: '人物弧光'
};

export function RegenerateFieldDialog({
  open,
  onClose,
  onSave,
  fieldName,
  currentValue,
  characterName
}: RegenerateFieldDialogProps) {
  const [requirement, setRequirement] = useState('');
  const [generatedValue, setGeneratedValue] = useState(currentValue || '');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      setRequirement('');
      setGeneratedValue(currentValue || '');
    }
  }, [open, currentValue]);

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      toast.error('请输入生成要求');
      return;
    }

    try {
      setIsGenerating(true);

      // 获取API设置
      const apiSettings = await getSettings();
      if (!apiSettings || !apiSettings.apiToken) {
        toast.error('请先在设置中配置 API Token');
        setIsGenerating(false);
        return;
      }

      // 调用API生成
      const response = await fetch('/api/novel/regenerate-character-field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName,
          fieldName,
          currentValue,
          requirement,
          apiToken: apiSettings.apiToken,
          model: apiSettings.aiModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `API请求失败 (${response.status})`;

        if (response.status === 401) {
          toast.error('API Token无效，请在应用设置中检查配置');
        } else {
          toast.error(errorMessage);
        }
        setIsGenerating(false);
        return;
      }

      const data = await response.json();
      setGeneratedValue(data.newValue);
      toast.success('生成成功');
    } catch (error) {
      console.error('Error regenerating field:', error);
      toast.error('生成失败，请检查网络连接或API配置');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    onSave(generatedValue);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            重新生成 - {characterName} - {fieldLabels[fieldName] || fieldName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 当前内容 */}
          <div>
            <label className="text-sm font-medium">当前内容</label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm whitespace-pre-wrap">
              {currentValue}
            </div>
          </div>

          {/* 生成要求 */}
          <div>
            <label className="text-sm font-medium">生成要求</label>
            <Textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="例如: 更加详细地描述外貌特征，增加身高体重等信息..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* 生成按钮 */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !requirement.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              '生成'
            )}
          </Button>

          {/* 生成结果 */}
          <div>
            <label className="text-sm font-medium">生成结果</label>
            <Textarea
              value={generatedValue}
              onChange={(e) => setGeneratedValue(e.target.value)}
              placeholder="生成的内容将显示在这里，你可以手动编辑..."
              className="mt-1"
              rows={6}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!generatedValue || !generatedValue.trim()}>
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

