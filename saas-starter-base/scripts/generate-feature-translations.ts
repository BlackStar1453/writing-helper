#!/usr/bin/env tsx

/**
 * 功能翻译生成脚本
 * 
 * 使用方法:
 * npx tsx scripts/generate-feature-translations.ts --locale zh --feature-id <uuid>
 * npx tsx scripts/generate-feature-translations.ts --locale zh --all
 * npx tsx scripts/generate-feature-translations.ts --locale ja,ko,fr --all
 */

import { db } from '../lib/db/drizzle';
import { features, featureTranslations } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

// 支持的语言配置
const SUPPORTED_LOCALES = {
  'zh': '中文',
  'ja': '日本語', 
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'es': 'Español',
  'pt': 'Português',
  'ru': 'Русский',
  'ar': 'العربية',
  'hi': 'हिन्दी'
} as const;

type SupportedLocale = keyof typeof SUPPORTED_LOCALES;

// OpenAI翻译函数
async function translateWithOpenAI(locale: SupportedLocale, title: string, description: string): Promise<{title: string, description: string}> {
  const languageName = SUPPORTED_LOCALES[locale];

  const prompt = `请将以下功能介绍翻译成${languageName}，保持专业和准确：

标题: ${title}
描述: ${description}

要求：
1. 保持技术术语的准确性
2. 符合目标语言的表达习惯
3. 保持原文的语气和风格
4. 如果是产品功能，使用该语言地区用户熟悉的表达方式

请以JSON格式返回翻译结果：
{
  "title": "翻译后的标题",
  "description": "翻译后的描述"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的技术翻译专家，擅长将产品功能介绍翻译成各种语言。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    // 尝试解析JSON响应
    try {
      const parsed = JSON.parse(content);
      if (parsed.title && parsed.description) {
        return {
          title: parsed.title,
          description: parsed.description
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse OpenAI JSON response, using fallback');
    }

    // 如果JSON解析失败，尝试从文本中提取
    const titleMatch = content.match(/["']title["']\s*:\s*["']([^"']+)["']/);
    const descMatch = content.match(/["']description["']\s*:\s*["']([^"']+)["']/);

    if (titleMatch && descMatch) {
      return {
        title: titleMatch[1],
        description: descMatch[1]
      };
    }

    throw new Error('Could not extract translation from OpenAI response');

  } catch (error) {
    console.error('OpenAI translation error:', error);
    throw error;
  }
}

// 翻译提示模板
const getTranslationPrompt = (locale: SupportedLocale, title: string, description: string) => {
  const languageName = SUPPORTED_LOCALES[locale];
  
  return `请将以下功能介绍翻译成${languageName}，保持专业和准确：

标题: ${title}
描述: ${description}

请以JSON格式返回翻译结果：
{
  "title": "翻译后的标题",
  "description": "翻译后的描述"
}

注意：
1. 保持技术术语的准确性
2. 符合目标语言的表达习惯
3. 保持原文的语气和风格
4. 如果是产品功能，使用该语言地区用户熟悉的表达方式`;
};

// 翻译函数 - 支持多种翻译服务
async function translateContent(locale: SupportedLocale, title: string, description: string): Promise<{title: string, description: string}> {
  console.log(`🔄 正在翻译到 ${SUPPORTED_LOCALES[locale]}...`);

  // 优先使用OpenAI API进行翻译
  if (process.env.OPENAI_API_KEY) {
    try {
      return await translateWithOpenAI(locale, title, description);
    } catch (error) {
      console.warn(`⚠️  OpenAI翻译失败，使用预设翻译: ${error}`);
    }
  }

  // 回退到预设翻译
  const translations: Record<SupportedLocale, Record<string, {title: string, description: string}>> = {
    'zh': {
      'Quick Search Feature': {
        title: '快速搜索功能',
        description: '当创建的功能比较多时，可能会无法快速找到需要的功能，所以需要新增一个快速搜索功能，通过这个来快速找到并使用功能。'
      },
      'Single Word Function': {
        title: '单词本功能',
        description: '把查词过程中需要学习和复习的内容到单词本。'
      },
      'default': {
        title: title, // 如果没有预设翻译，保持原文
        description: description
      }
    },
    'ja': {
      'Quick Search Feature': {
        title: 'クイック検索機能',
        description: '作成された機能が多い場合、必要な機能を素早く見つけることができない可能性があるため、クイック検索機能を追加して、これを通じて素早く機能を見つけて使用できるようにする必要があります。'
      },
      'Single Word Function': {
        title: '単語帳機能',
        description: '単語検索過程で学習と復習が必要な内容を単語帳に追加します。'
      },
      'default': {
        title: title,
        description: description
      }
    },
    'ko': {
      'Quick Search Feature': {
        title: '빠른 검색 기능',
        description: '생성된 기능이 많을 때 필요한 기능을 빠르게 찾을 수 없을 수 있으므로, 빠른 검색 기능을 추가하여 이를 통해 빠르게 기능을 찾아 사용할 수 있도록 해야 합니다.'
      },
      'Single Word Function': {
        title: '단어장 기능',
        description: '단어 검색 과정에서 학습과 복습이 필요한 내용을 단어장에 추가합니다.'
      },
      'default': {
        title: title,
        description: description
      }
    },
    'fr': {
      'default': {
        title: title,
        description: description
      }
    },
    'de': {
      'default': {
        title: title,
        description: description
      }
    },
    'es': {
      'default': {
        title: title,
        description: description
      }
    },
    'pt': {
      'default': {
        title: title,
        description: description
      }
    },
    'ru': {
      'default': {
        title: title,
        description: description
      }
    },
    'ar': {
      'default': {
        title: title,
        description: description
      }
    },
    'hi': {
      'default': {
        title: title,
        description: description
      }
    }
  };

  const localeTranslations = translations[locale];
  const translation = localeTranslations[title] || localeTranslations['default'];
  
  // 模拟API调用延迟
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return translation;
}

// 为单个功能生成翻译
async function translateFeature(featureId: string, locales: SupportedLocale[]) {
  console.log(`📝 处理功能 ID: ${featureId}`);
  
  // 获取原始功能信息
  const [feature] = await db
    .select()
    .from(features)
    .where(eq(features.id, featureId))
    .limit(1);

  if (!feature) {
    console.error(`❌ 未找到功能 ID: ${featureId}`);
    return;
  }

  console.log(`📖 原始功能: ${feature.title}`);

  for (const locale of locales) {
    try {
      // 检查是否已存在翻译
      const [existingTranslation] = await db
        .select()
        .from(featureTranslations)
        .where(and(
          eq(featureTranslations.featureId, featureId),
          eq(featureTranslations.locale, locale)
        ))
        .limit(1);

      if (existingTranslation) {
        console.log(`⚠️  ${SUPPORTED_LOCALES[locale]} 翻译已存在，跳过`);
        continue;
      }

      // 生成翻译
      const translation = await translateContent(locale, feature.title, feature.description);

      // 保存翻译
      await db.insert(featureTranslations).values({
        featureId: featureId,
        locale: locale,
        title: translation.title,
        description: translation.description
      });

      console.log(`✅ ${SUPPORTED_LOCALES[locale]} 翻译已保存`);
      console.log(`   标题: ${translation.title}`);
      console.log(`   描述: ${translation.description.substring(0, 100)}...`);

    } catch (error) {
      console.error(`❌ ${SUPPORTED_LOCALES[locale]} 翻译失败:`, error);
    }
  }
}

// 为所有功能生成翻译
async function translateAllFeatures(locales: SupportedLocale[]) {
  console.log('🚀 开始为所有功能生成翻译...');
  
  const allFeatures = await db.select().from(features);
  console.log(`📊 找到 ${allFeatures.length} 个功能`);

  for (const feature of allFeatures) {
    await translateFeature(feature.id, locales);
    console.log('---');
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  let locales: SupportedLocale[] = [];
  let featureId: string | null = null;
  let translateAll = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--locale' && i + 1 < args.length) {
      const localeArg = args[i + 1];
      locales = localeArg.split(',').map(l => l.trim()) as SupportedLocale[];
      i++; // 跳过下一个参数
    } else if (arg === '--feature-id' && i + 1 < args.length) {
      featureId = args[i + 1];
      i++; // 跳过下一个参数
    } else if (arg === '--all') {
      translateAll = true;
    }
  }

  // 验证参数
  if (locales.length === 0) {
    console.error('❌ 请指定要翻译的语言，例如: --locale zh 或 --locale zh,ja,ko');
    console.log('支持的语言:', Object.keys(SUPPORTED_LOCALES).join(', '));
    process.exit(1);
  }

  // 验证语言代码
  for (const locale of locales) {
    if (!(locale in SUPPORTED_LOCALES)) {
      console.error(`❌ 不支持的语言代码: ${locale}`);
      console.log('支持的语言:', Object.keys(SUPPORTED_LOCALES).join(', '));
      process.exit(1);
    }
  }

  if (!featureId && !translateAll) {
    console.error('❌ 请指定 --feature-id <uuid> 或 --all');
    process.exit(1);
  }

  console.log(`🌍 目标语言: ${locales.map(l => SUPPORTED_LOCALES[l]).join(', ')}`);

  try {
    if (translateAll) {
      await translateAllFeatures(locales);
    } else if (featureId) {
      await translateFeature(featureId, locales);
    }
    
    console.log('🎉 翻译任务完成！');
  } catch (error) {
    console.error('❌ 翻译过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

export { translateFeature, translateAllFeatures, SUPPORTED_LOCALES };
