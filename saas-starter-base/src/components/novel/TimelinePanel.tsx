'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Check, X, GripVertical, Sparkles } from 'lucide-react';

export interface TimelineItem {
  id: string;
  order: number;
  content: string;
}

interface TimelinePanelProps {
  timeline: TimelineItem[];
  onChange: (timeline: TimelineItem[]) => void;
  readOnly?: boolean;
  onGenerateContent?: (timelineItem: TimelineItem, index: number) => void;
  generatingItemId?: string | null;
}

export function TimelinePanel({
  timeline,
  onChange,
  readOnly = false,
  onGenerateContent,
  generatingItemId
}: TimelinePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleStartEdit = (item: TimelineItem) => {
    setEditingId(item.id);
    setEditingContent(item.content);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    
    const updatedTimeline = timeline.map(item =>
      item.id === editingId ? { ...item, content: editingContent } : item
    );
    onChange(updatedTimeline);
    setEditingId(null);
    setEditingContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleDelete = (id: string) => {
    const updatedTimeline = timeline
      .filter(item => item.id !== id)
      .map((item, index) => ({ ...item, order: index + 1 }));
    onChange(updatedTimeline);
  };

  const handleAdd = () => {
    if (!newItemContent.trim()) return;

    const newItem: TimelineItem = {
      id: `timeline-${Date.now()}`,
      order: timeline.length + 1,
      content: newItemContent.trim()
    };

    onChange([...timeline, newItem]);
    setNewItemContent('');
    setShowAddForm(false);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newTimeline = [...timeline];
    [newTimeline[index - 1], newTimeline[index]] = [newTimeline[index], newTimeline[index - 1]];
    
    // 更新order
    const reorderedTimeline = newTimeline.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));
    
    onChange(reorderedTimeline);
  };

  const handleMoveDown = (index: number) => {
    if (index === timeline.length - 1) return;
    
    const newTimeline = [...timeline];
    [newTimeline[index], newTimeline[index + 1]] = [newTimeline[index + 1], newTimeline[index]];
    
    // 更新order
    const reorderedTimeline = newTimeline.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));
    
    onChange(reorderedTimeline);
  };

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">剧情时间线</h4>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        )}
      </div>

      {timeline.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          暂无时间线
        </div>
      )}

      {/* 添加新条目表单 */}
      {showAddForm && !readOnly && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
          <Textarea
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            placeholder="输入时间线条目内容..."
            className="min-h-[60px]"
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setNewItemContent('');
              }}
            >
              <X className="h-4 w-4 mr-1" />
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newItemContent.trim()}
            >
              <Check className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>
        </div>
      )}

      {/* 时间线列表 */}
      <div className="space-y-2">
        {timeline.map((item, index) => (
          <div
            key={item.id}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            {editingId === item.id ? (
              // 编辑模式
              <div className="space-y-2">
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4 mr-1" />
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              // 显示模式
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-medium">
                  {item.order}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
                {!readOnly && (
                  <div className="flex-shrink-0 flex gap-1">
                    {onGenerateContent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onGenerateContent(item, index)}
                        disabled={generatingItemId === item.id}
                        className="h-8 w-8 p-0 text-purple-500 hover:text-purple-600"
                        title="生成该节点对应的内容"
                      >
                        {generatingItemId === item.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === timeline.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(item)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

