'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, MapPin, Clock, BookOpen, FileText, FolderOpen, ChevronDown, Sparkles, Menu, Settings, Calendar, Cog } from 'lucide-react';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    name: '章节',
    href: '/novel/chapters',
    icon: <FileText className="h-5 w-5" />
  },
  {
    name: '人物',
    href: '/novel/characters',
    icon: <User className="h-5 w-5" />
  },
  {
    name: '地点',
    href: '/novel/locations',
    icon: <MapPin className="h-5 w-5" />
  },
  {
    name: '时间线',
    href: '/novel/timeline',
    icon: <Clock className="h-5 w-5" />
  },
  {
    name: 'Prompt',
    href: '/novel/prompts',
    icon: <Sparkles className="h-5 w-5" />
  },
  {
    name: 'Menu',
    href: '/novel/menus',
    icon: <Menu className="h-5 w-5" />
  },
  {
    name: '设定',
    href: '/novel/settings',
    icon: <Settings className="h-5 w-5" />
  },
  {
    name: '事件',
    href: '/novel/events',
    icon: <Calendar className="h-5 w-5" />
  },
  {
    name: '应用设置',
    href: '/novel/app-settings',
    icon: <Cog className="h-5 w-5" />
  }
];

export function NovelNav({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { novels, currentNovel, switchNovel } = useNovels();

  // 检查当前路径是否匹配导航项
  const isActive = (href: string) => {
    // 移除语言前缀进行匹配
    const pathWithoutLocale = pathname.replace(/^\/(en|zh)/, '');
    return pathWithoutLocale.startsWith(href);
  };

  const handleSwitchNovel = (novelId: string) => {
    switchNovel(novelId);
    // 切换项目后重新加载页面以刷新所有数据
    window.location.reload();
  };

  return (
    <>
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <BookOpen className="h-6 w-6 text-gray-900 dark:text-white" />
              <h1 className="text-lg font-light text-gray-900 dark:text-white">
                小说创作工具
              </h1>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm transition-colors ${
                      active
                        ? 'text-gray-900 dark:text-white font-medium'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}

              {/* 项目切换器 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400"
                  >
                    <span className="max-w-[120px] truncate">
                      {currentNovel?.title || '选择项目'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {novels.map((novel) => (
                    <DropdownMenuItem
                      key={novel.id}
                      onClick={() => handleSwitchNovel(novel.id)}
                    >
                      <span className="flex-1 truncate">{novel.title}</span>
                      {currentNovel?.id === novel.id && (
                        <span className="text-xs">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/novel/projects')}>
                    管理项目
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}

