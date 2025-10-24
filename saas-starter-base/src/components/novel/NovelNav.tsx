'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, MapPin, Clock, BookOpen, FileText, FolderOpen, ChevronDown } from 'lucide-react';
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
    // 切换项目后刷新当前页面
    router.refresh();
  };

  return (
    <>
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  小说创作工具
                </h1>
              </div>

              {/* 项目切换器 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    <span className="max-w-[150px] truncate">
                      {currentNovel?.title || '选择项目'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {novels.map((novel) => (
                    <DropdownMenuItem
                      key={novel.id}
                      onClick={() => handleSwitchNovel(novel.id)}
                      className={currentNovel?.id === novel.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span className="flex-1 truncate">{novel.title}</span>
                      {currentNovel?.id === novel.id && (
                        <span className="text-xs text-emerald-600">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/novel/projects')}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    管理项目
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      active
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="hidden sm:inline">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}

