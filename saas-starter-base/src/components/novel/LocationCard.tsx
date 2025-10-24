/**
 * 地点卡片组件
 */

'use client';

import React, { useState } from 'react';
import { Location, Reference } from '@/lib/novel/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, FileText, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';

interface LocationCardProps {
  location: Location;
  onEdit: (location: Location) => void;
  onDelete: (id: string) => void;
}

export function LocationCard({ location, onEdit, onDelete }: LocationCardProps) {
  const [expandedSections, setExpandedSections] = useState({
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
            {location.image ? (
              <img
                src={location.image}
                alt={location.name}
                className="h-12 w-12 object-cover rounded"
              />
            ) : (
              <div className="flex items-center justify-center h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded">
                <MapPin className="h-6 w-6 text-gray-500" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold">{location.name}</h3>
              {location.type && (
                <p className="text-sm text-gray-500">{location.type}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(location)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(location.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 描述 */}
        {location.description && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {location.description}
            </p>
          </div>
        )}

        {/* 引用记录 */}
        <div className="border-t pt-4">
          <button
            onClick={() => toggleSection('references')}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="font-medium">引用</span>
              <span className="text-sm text-gray-500">({location.references?.length || 0})</span>
            </div>
            {expandedSections.references ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSections.references && (
            <div className="mt-3 space-y-2">
              {location.references?.length > 0 ? (
                location.references.map((ref: Reference) => (
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

