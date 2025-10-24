/**
 * Prompt卡片组件
 */

'use client';

import React, { useState } from 'react';
import { PromptCard as PromptCardType } from '@/lib/novel/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';

interface PromptCardProps {
  prompt: PromptCardType;
  onEdit: (prompt: PromptCardType) => void;
  onDelete: (id: string) => void;
}

export function PromptCard({ prompt, onEdit, onDelete }: PromptCardProps) {
  const [expandedSections, setExpandedSections] = useState({
    exampleBefore: false,
    exampleAfter: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
      </CardContent>
    </Card>
  );
}

