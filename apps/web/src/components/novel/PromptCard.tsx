/**
 * Prompt卡片组件
 */

'use client';

import React, { useState } from 'react';
import { PromptCard as PromptCardType } from '@/lib/novel/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, ChevronDown, ChevronUp, Edit, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface PromptCardProps {
  prompt: PromptCardType;
  onEdit: (prompt: PromptCardType) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<PromptCardType>) => Promise<void>;
}

export function PromptCard({ prompt, onEdit, onDelete, onUpdate }: PromptCardProps) {
  const [expandedSections, setExpandedSections] = useState({
    exampleBefore: false,
    exampleAfter: false,
    testGenerate: false,
  });
  const [temperature, setTemperature] = useState(0.7);
  const [testInput, setTestInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTestGenerate = async () => {
    if (!testInput.trim()) {
      toast.error('请输入测试文本');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/novel/test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptDescription: prompt.description,
          exampleBefore: prompt.exampleBefore,
          testInput,
          temperature,
        }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const data = await response.json();
      setGeneratedText(data.generatedText);
      toast.success('生成成功!');
    } catch (error) {
      console.error('Test generate error:', error);
      toast.error('生成失败,请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!generatedText) {
      toast.error('没有生成的文本可保存');
      return;
    }

    try {
      await onUpdate(prompt.id, { exampleAfter: generatedText });
      toast.success('已保存到示例文本');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存失败');
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full">
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{prompt.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{prompt.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(prompt)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(prompt.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 示例文本(Before) */}
        <div>
          <button
            onClick={() => toggleSection('exampleBefore')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              示例文本(符合描述)
            </span>
            {expandedSections.exampleBefore ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.exampleBefore && (
            <div className="pl-6 space-y-2">
              {prompt.exampleBefore ? (
                <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  {prompt.exampleBefore}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">暂无示例</p>
              )}
            </div>
          )}
        </div>

        {/* 示例文本(After) */}
        <div>
          <button
            onClick={() => toggleSection('exampleAfter')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              生成的文本示例
            </span>
            {expandedSections.exampleAfter ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.exampleAfter && (
            <div className="pl-6 space-y-2">
              {prompt.exampleAfter ? (
                <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  {prompt.exampleAfter}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">暂无生成示例</p>
              )}
            </div>
          )}
        </div>

        {/* 测试生成 */}
        <div className="border-t pt-4">
          <button
            onClick={() => toggleSection('testGenerate')}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              测试生成
            </span>
            {expandedSections.testGenerate ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.testGenerate && (
            <div className="pl-6 space-y-4">
              {/* Temperature控制 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <Label htmlFor={`temp-${prompt.id}`} className="text-sm font-medium">
                  Temperature: {temperature.toFixed(1)}
                </Label>
                <Input
                  id={`temp-${prompt.id}`}
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full mt-2"
                />
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span>精确(0)</span>
                  <span>平衡(0.7)</span>
                  <span>创意(1.5)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 建议: 0.7-1.0 适合大多数场景
                </p>
              </div>

              {/* 测试输入 */}
              <div>
                <Label htmlFor={`input-${prompt.id}`} className="text-sm font-medium">
                  测试输入
                </Label>
                <textarea
                  id={`input-${prompt.id}`}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="输入要测试的文本..."
                  className="w-full min-h-[120px] p-3 border rounded text-sm mt-2 resize-y"
                />
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={handleTestGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    生成测试文本
                  </>
                )}
              </Button>

              {/* 生成结果 */}
              {generatedText && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                      ✨ 生成结果
                    </Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveGenerated}
                      className="text-xs"
                    >
                      💾 保存到示例
                    </Button>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-white dark:bg-gray-800 p-4 rounded border">
                    {generatedText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

