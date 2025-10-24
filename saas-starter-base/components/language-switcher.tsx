'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

const languages = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('LanguageSwitcher');

  // 从路径中推断当前语言，而不是仅依赖 useLocale
  const detectCurrentLocale = () => {
    if (pathname.startsWith('/en')) {
      return 'en';
    }
    return 'zh'; // 默认为中文
  };

  const currentLocale = detectCurrentLocale();
  const currentLanguage = languages.find(lang => lang.code === currentLocale);

  const handleLanguageSwitch = (targetLocale: string) => {
    console.log('Switching language:', { currentLocale, pathname, targetLocale });
    
    // 如果点击的是当前语言，不执行任何操作
    if (currentLocale === targetLocale) {
      console.log('Same locale clicked, ignoring');
      return;
    }
    
    // 获取不带语言前缀的路径
    let basePath = pathname;

    // 如果当前是英文页面，移除 /en 前缀
    if (pathname.startsWith('/en')) {
      basePath = pathname.substring('/en'.length) || '/';
    }

    // 构建新路径
    let newPath;
    if (targetLocale === 'zh') {
      // 中文是默认语言，直接使用基础路径
      newPath = basePath;
    } else if (targetLocale === 'en') {
      // 英文需要添加 /en 前缀
      newPath = basePath === '/' ? '/en' : `/en${basePath}`;
    }
    
    console.log('Navigating to:', { targetLocale, basePath, newPath });
    
    if (newPath) {
      // 使用 window.location.href 强制导航，避免 Next.js 路由缓存问题
      window.location.href = newPath;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-auto px-3 py-2 h-auto"
          title={t('switchLanguage')}
        >
          <Languages className="h-4 w-4 mr-2" />
          <span className="mr-1">{currentLanguage?.flag}</span>
          <span className="hidden sm:inline">{currentLanguage?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageSwitch(language.code)}
            className={`cursor-pointer flex items-center ${
              language.code === currentLocale ? 'font-medium' : ''
            }`}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
            {language.code === currentLocale && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 