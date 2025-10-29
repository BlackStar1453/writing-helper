'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  MapPin,
  Clock,
  BookOpen,
  FileText,
  FolderOpen,
  ChevronDown,
  Sparkles,
  Menu,
  Settings,
  Calendar,
  PenTool,
  ChevronRight,
  Cog
} from 'lucide-react';
import { useNovels } from '@/lib/novel/hooks/use-novels';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FeatureItem {
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const featureItems: FeatureItem[] = [
  {
    name: '章节管理',
    description: '创建和管理小说章节',
    href: '/novel/chapters',
    icon: <FileText className="h-5 w-5" />
  },
  {
    name: '人物卡片',
    description: '记录角色信息和背景',
    href: '/novel/characters',
    icon: <User className="h-5 w-5" />
  },
  {
    name: '地点卡片',
    description: '描述故事场景和地点',
    href: '/novel/locations',
    icon: <MapPin className="h-5 w-5" />
  },
  {
    name: '时间线',
    description: '规划故事时间线和事件',
    href: '/novel/timeline',
    icon: <Clock className="h-5 w-5" />
  },
  {
    name: 'Prompt卡片',
    description: '定义写作风格和要求',
    href: '/novel/prompts',
    icon: <Sparkles className="h-5 w-5" />
  },
  {
    name: '设定卡片',
    description: '记录世界观和背景',
    href: '/novel/settings',
    icon: <Settings className="h-5 w-5" />
  },
  {
    name: '事件卡片',
    description: '规划重要事件流程',
    href: '/novel/events',
    icon: <Calendar className="h-5 w-5" />
  },
  {
    name: '应用设置',
    description: '配置应用参数和偏好',
    href: '/novel/app-settings',
    icon: <Cog className="h-5 w-5" />
  }
];

export function NovelHomePage() {
  const router = useRouter();
  const { novels, currentNovel, switchNovel, createNovel } = useNovels();

  const handleSwitchNovel = async (novelId: string) => {
    await switchNovel(novelId);
    // 刷新页面以确保所有数据更新
    window.location.reload();
  };

  const handleCreateNovel = async () => {
    const title = prompt('请输入小说项目名称:');
    if (title && title.trim()) {
      await createNovel({ title: title.trim() });
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <PenTool className="h-8 w-8 text-gray-900 dark:text-white" />
              <h1 className="text-xl font-light text-gray-900 dark:text-white">
                小说创作工具
              </h1>
            </div>

            {/* Project Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg"
                >
                  <span className="max-w-[150px] truncate text-gray-600 dark:text-gray-400">
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
                <DropdownMenuItem onClick={handleCreateNovel}>
                  创建新项目
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h2 className="text-5xl font-light text-gray-900 dark:text-white mb-6">
            开始创作
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 font-light">
            AI驱动的智能创作助手
          </p>
        </div>

        {/* Feature List */}
        <div className="space-y-1 max-w-2xl mx-auto">
          {featureItems.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group block px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                    <div className="text-gray-600 dark:text-gray-400">
                      {feature.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      {feature.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-light">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-600 font-light">
            小说创作工具
          </p>
        </div>
      </footer>
    </div>
  );
}

