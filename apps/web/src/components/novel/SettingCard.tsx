/**
 * 设定卡片组件
 */

'use client';

import React from 'react';
import { SettingCard as SettingCardType } from '@/lib/novel/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Edit, Trash2 } from 'lucide-react';

interface SettingCardProps {
  setting: SettingCardType;
  onEdit: (setting: SettingCardType) => void;
  onDelete: (id: string) => void;
}

export function SettingCard({ setting, onEdit, onDelete }: SettingCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900">
              <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{setting.name}</h3>
                <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded">
                  {setting.category}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(setting)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(setting.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-gray-500">设定描述:</span>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {setting.description}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

