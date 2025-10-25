/**
 * 人物卡片组件
 */

'use client';

import React, { useState } from 'react';
import { Character, CharacterTimelineEvent, CharacterRelationship, Reference } from '@/lib/novel/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { User, Calendar, Users, FileText, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';

interface CharacterCardProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
  onCharacterClick?: (id: string) => void;
}

export function CharacterCard({ character, onEdit, onDelete, onCharacterClick }: CharacterCardProps) {
  const [expandedSections, setExpandedSections] = useState({
    timeline: false,
    relationships: false,
    references: false
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
            <Avatar className="h-12 w-12">
              {character.avatar ? (
                <img src={character.avatar} alt={character.name} className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full w-full bg-gray-200 dark:bg-gray-700">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
              )}
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{character.name}</h3>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(character)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(character.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 基础信息 */}
        {character.basicInfo.description && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500">基本信息</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {character.basicInfo.description}
            </p>
          </div>
        )}

        {/* 外貌描述 */}
        {character.basicInfo.appearance && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500">外貌</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {character.basicInfo.appearance}
            </p>
          </div>
        )}

        {/* 性格描述 */}
        {character.basicInfo.personality && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500">性格</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {character.basicInfo.personality}
            </p>
          </div>
        )}

        {/* 人物弧光 */}
        {character.basicInfo.characterArc && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500">人物弧光</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {character.basicInfo.characterArc}
            </p>
          </div>
        )}

        {/* 时间线 */}
        <div className="border-t pt-4">
          <button
            onClick={() => toggleSection('timeline')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">时间线</span>
              <span className="text-sm text-gray-500">({character.timeline?.length || 0})</span>
            </div>
            {expandedSections.timeline ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.timeline && (
            <div className="mt-3 space-y-2">
              {character.timeline?.length > 0 ? (
                character.timeline.map((event: CharacterTimelineEvent) => (
                  <div key={event.id} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium">{event.title}</div>
                    <div className="text-xs text-gray-500">{event.date}</div>
                    {event.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {event.description}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">暂无时间线事件</p>
              )}
            </div>
          )}
        </div>

        {/* 关系网络 */}
        <div className="border-t pt-4">
          <button
            onClick={() => toggleSection('relationships')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">关系</span>
              <span className="text-sm text-gray-500">({character.relationships?.length || 0})</span>
            </div>
            {expandedSections.relationships ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.relationships && (
            <div className="mt-3 space-y-2">
              {character.relationships?.length > 0 ? (
                character.relationships.map((rel: CharacterRelationship) => (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {rel.relationshipType}
                        {rel.isBidirectional && <span className="text-xs text-gray-500 ml-1">(双向)</span>}
                      </div>
                      {rel.description && (
                        <div className="text-xs text-gray-500">{rel.description}</div>
                      )}
                    </div>
                    {onCharacterClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCharacterClick(rel.targetCharacterId)}
                      >
                        查看
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">暂无关系</p>
              )}
            </div>
          )}
        </div>

        {/* 引用记录 */}
        <div className="border-t pt-4">
          <button
            onClick={() => toggleSection('references')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="font-medium">引用</span>
              <span className="text-sm text-gray-500">({character.references?.length || 0})</span>
            </div>
            {expandedSections.references ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.references && (
            <div className="mt-3 space-y-2">
              {character.references?.length > 0 ? (
                character.references.map((ref: Reference) => (
                  <div key={ref.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-sm line-clamp-2">{ref.content}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      章节: {ref.chapterId}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">暂无引用</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

