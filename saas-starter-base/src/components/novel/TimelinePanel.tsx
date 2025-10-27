'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Check, X, GripVertical, Sparkles, Lightbulb, CheckCircle, GitCompare } from 'lucide-react';
import { ChapterTimelineItem } from '@/lib/novel/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DiffMatchPatch from 'diff-match-patch';

/**
 * 可排序的时间线项组件
 */
interface SortableTimelineItemProps {
  item: ChapterTimelineItem;
  index: number;
  readOnly: boolean;
  editingId: string | null;
  editingContent: string;
  generatingItemId?: string | null;
  onStartEdit: (item: ChapterTimelineItem) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingContentChange: (content: string) => void;
  onDelete: (id: string) => void;
  onGenerateContent?: (item: ChapterTimelineItem, index: number) => void;
  onJumpToContent?: (id: string) => void;
  onUpdateSuggestion?: (id: string, suggestion: string) => void;
  onToggleReviewed?: (id: string) => void;
  onRegenerateContent?: (item: ChapterTimelineItem, index: number) => void;
}

function SortableTimelineItem({
  item,
  index,
  readOnly,
  editingId,
  editingContent,
  generatingItemId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditingContentChange,
  onDelete,
  onGenerateContent,
  onJumpToContent,
  onUpdateSuggestion,
  onToggleReviewed,
  onRegenerateContent,
}: SortableTimelineItemProps) {
  const [editingSuggestion, setEditingSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState(item.modificationSuggestion || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveSuggestion = () => {
    onUpdateSuggestion?.(item.id, suggestionText);
    setEditingSuggestion(false);
  };

  const handleCancelSuggestion = () => {
    setSuggestionText(item.modificationSuggestion || '');
    setEditingSuggestion(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      {editingId === item.id ? (
        // 编辑模式
        <div className="space-y-2">
          <Textarea
            value={editingContent}
            onChange={(e) => onEditingContentChange(e.target.value)}
            className="min-h-[60px]"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
              <X className="h-4 w-4 mr-1" />
              取消
            </Button>
            <Button size="sm" onClick={onSaveEdit}>
              <Check className="h-4 w-4 mr-1" />
              保存
            </Button>
          </div>
        </div>
      ) : (
        // 显示模式
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            {/* 拖拽手柄 */}
            {!readOnly && (
              <div
                {...attributes}
                {...listeners}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 flex items-center justify-center cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            )}

            {/* 序号 */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-medium">
              {item.order}
            </div>

            {/* 内容 */}
            <div
              className="flex-1 min-w-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
              onClick={() => onJumpToContent?.(item.id)}
              title="点击跳转到对应内容"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {item.content}
              </p>
            </div>

            {/* 操作按钮 */}
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
                  onClick={() => onStartEdit(item)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(item.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* 修改建议区域 */}
          {!readOnly && (
            <div className="ml-16 space-y-2">
              {editingSuggestion ? (
                // 编辑修改建议
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <Lightbulb className="h-3 w-3" />
                    <span>修改建议</span>
                  </div>
                  <Textarea
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                    placeholder="输入修改建议..."
                    className="min-h-[60px] text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={handleCancelSuggestion}>
                      <X className="h-4 w-4 mr-1" />
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSaveSuggestion}>
                      <Check className="h-4 w-4 mr-1" />
                      保存
                    </Button>
                  </div>
                </div>
              ) : item.modificationSuggestion ? (
                // 显示修改建议
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <Lightbulb className="h-3 w-3" />
                    <span>修改建议</span>
                  </div>
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {item.modificationSuggestion}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {onRegenerateContent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRegenerateContent(item, index)}
                        disabled={generatingItemId === item.id}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        {generatingItemId === item.id ? (
                          <div className="animate-spin h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full mr-1" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        重新生成
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingSuggestion(true)}
                      className="text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onUpdateSuggestion?.(item.id, '')}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      删除
                    </Button>
                    {onToggleReviewed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToggleReviewed(item.id)}
                        className={`text-xs ml-auto ${item.isReviewed ? 'text-green-600' : 'text-gray-500'}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {item.isReviewed ? '已审核' : '标记为已审核'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                // 添加修改建议按钮
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingSuggestion(true)}
                  className="text-xs text-amber-600 hover:text-amber-700"
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  添加修改建议
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export interface ContentVersion {
  version: number;
  content: string;
}

export interface CandidateVersions {
  timelineItemId: string;
  versions: ContentVersion[];
}

interface TimelinePanelProps {
  timeline: ChapterTimelineItem[];
  onChange: (timeline: ChapterTimelineItem[]) => void;
  readOnly?: boolean;
  onGenerateContent?: (timelineItem: ChapterTimelineItem, index: number) => void;
  onRegenerateContent?: (timelineItem: ChapterTimelineItem, index: number) => void;
  generatingItemId?: string | null;
  candidateVersions?: CandidateVersions | null;
  onApplyVersion?: (version: ContentVersion) => void;
  onClearCandidates?: () => void;
  onJumpToContent?: (timelineItemId: string) => void;
}

export function TimelinePanel({
  timeline,
  onChange,
  readOnly = false,
  onGenerateContent,
  onRegenerateContent,
  generatingItemId,
  candidateVersions,
  onApplyVersion,
  onClearCandidates,
  onJumpToContent
}: TimelinePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [comparingVersion, setComparingVersion] = useState<number | null>(null);

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleStartEdit = (item: ChapterTimelineItem) => {
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

    const newItem: ChapterTimelineItem = {
      id: `timeline-${Date.now()}`,
      order: timeline.length + 1,
      content: newItemContent.trim()
    };

    onChange([...timeline, newItem]);
    setNewItemContent('');
    setShowAddForm(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = timeline.findIndex((item) => item.id === active.id);
      const newIndex = timeline.findIndex((item) => item.id === over.id);

      const newTimeline = arrayMove(timeline, oldIndex, newIndex);

      // 更新order
      const reorderedTimeline = newTimeline.map((item, idx) => ({
        ...item,
        order: idx + 1
      }));

      onChange(reorderedTimeline);
    }
  };

  const handleUpdateSuggestion = (id: string, suggestion: string) => {
    const updatedTimeline = timeline.map(item =>
      item.id === id ? { ...item, modificationSuggestion: suggestion || undefined } : item
    );
    onChange(updatedTimeline);
  };

  const handleToggleReviewed = (id: string) => {
    const updatedTimeline = timeline.map(item =>
      item.id === id ? { ...item, isReviewed: !item.isReviewed } : item
    );
    onChange(updatedTimeline);
  };

  // 生成diff HTML
  const generateDiffHtml = (originalContent: string, newContent: string): string => {
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(originalContent, newContent);
    dmp.diff_cleanupSemantic(diffs);

    let html = '';
    for (const [op, text] of diffs) {
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');

      if (op === -1) {
        // 删除的内容 - 红色背景
        html += `<span class="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 line-through">${escapedText}</span>`;
      } else if (op === 1) {
        // 新增的内容 - 绿色背景
        html += `<span class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">${escapedText}</span>`;
      } else {
        // 未改变的内容
        html += `<span>${escapedText}</span>`;
      }
    }

    return html;
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={timeline.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {timeline.map((item, index) => (
              <React.Fragment key={item.id}>
                <SortableTimelineItem
                  item={item}
                  index={index}
                  readOnly={readOnly}
                  editingId={editingId}
                  editingContent={editingContent}
                  generatingItemId={generatingItemId}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onEditingContentChange={setEditingContent}
                  onDelete={handleDelete}
                  onGenerateContent={onGenerateContent}
                  onJumpToContent={onJumpToContent}
                  onUpdateSuggestion={handleUpdateSuggestion}
                  onToggleReviewed={handleToggleReviewed}
                  onRegenerateContent={onRegenerateContent}
                />

                {/* 候选版本显示 - 保持原有逻辑 */}
                {candidateVersions && candidateVersions.timelineItemId === item.id && editingId !== item.id && (
                  <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        候选内容 (选择一个应用)
                      </h5>
                      {onClearCandidates && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={onClearCandidates}
                          className="h-6 px-2 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          取消
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {candidateVersions.versions.map((ver) => {
                        const cleanContent = ver.content.replace(/<!-- TIMELINE_NODE:.*? -->\n?/g, '').replace(/\n?<!-- \/TIMELINE_NODE -->/g, '').trim();
                        const originalContent = item.content || '';
                        const isComparing = comparingVersion === ver.version;

                        return (
                          <div key={ver.version} className="space-y-2">
                            <div
                              className={`p-2 rounded border cursor-pointer transition-colors ${
                                selectedVersion === ver.version
                                  ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                              }`}
                              onClick={() => setSelectedVersion(ver.version)}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="radio"
                                  name={`version-${item.id}`}
                                  checked={selectedVersion === ver.version}
                                  onChange={() => setSelectedVersion(ver.version)}
                                  className="mt-1 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                      版本 {ver.version}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setComparingVersion(isComparing ? null : ver.version);
                                      }}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <GitCompare className="h-3 w-3 mr-1" />
                                      {isComparing ? '隐藏对比' : '对比'}
                                    </Button>
                                  </div>
                                  {!isComparing && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                                      {cleanContent}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 对比视图 */}
                            {isComparing && (
                              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  差异对比
                                </div>
                                <div className="text-xs leading-relaxed">
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: generateDiffHtml(originalContent, cleanContent)
                                    }}
                                  />
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded"></span>
                                    <span className="text-gray-600 dark:text-gray-400">删除</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded"></span>
                                    <span className="text-gray-600 dark:text-gray-400">新增</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {onApplyVersion && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const selected = candidateVersions.versions.find(v => v.version === selectedVersion);
                          if (selected) {
                            onApplyVersion(selected);
                            setSelectedVersion(null);
                          }
                        }}
                        disabled={selectedVersion === null}
                        className="w-full mt-3"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        应用选中版本
                      </Button>
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

