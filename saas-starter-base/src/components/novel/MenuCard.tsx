/**
 * Menu卡片组件
 */

'use client';

import React from 'react';
import { MenuCard as MenuCardType } from '@/lib/novel/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Menu, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

interface MenuCardProps {
  menu: MenuCardType;
  onEdit: (menu: MenuCardType) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
}

export function MenuCard({ menu, onEdit, onDelete, onToggleEnabled }: MenuCardProps) {
  return (
    <Card className={`hover:shadow-lg transition-shadow ${!menu.enabled ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={`flex items-center justify-center h-12 w-12 rounded-full ${
              menu.enabled 
                ? 'bg-indigo-100 dark:bg-indigo-900' 
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <Menu className={`h-6 w-6 ${
                menu.enabled 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-gray-400'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{menu.name}</h3>
                {!menu.enabled && (
                  <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                    已禁用
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{menu.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleEnabled(menu.id, !menu.enabled)}
              title={menu.enabled ? '禁用' : '启用'}
            >
              {menu.enabled ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(menu)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(menu.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-gray-500">Prompt模板:</span>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded whitespace-pre-wrap">
              {menu.promptTemplate}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>显示顺序: {menu.order}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

