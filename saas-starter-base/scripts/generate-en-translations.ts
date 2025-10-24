#!/usr/bin/env tsx

import { db } from '../lib/db/drizzle';
import { features, featureTranslations } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// 中文到英文的翻译映射
const TRANSLATIONS: Record<string, { title: string; description: string }> = {
  'Speak功能': {
    title: 'Text-to-Speech Feature',
    description: 'Use TTS for pronunciation with customizable speech rate and different accents. Supports multiple languages and natural voice synthesis.'
  },
  'YouGlish功能': {
    title: 'YouGlish Integration',
    description: 'Find real human pronunciation directly from YouTube videos. Learn correct pronunciation and usage context through authentic video content.'
  },
  '选取单词直接获取上下文功能': {
    title: 'Word Selection Context Feature',
    description: 'Select words in any area to directly get the sentence context. Intelligently recognizes context for more accurate understanding.'
  },
  'Prompt设置': {
    title: 'Prompt Templates',
    description: 'Save commonly used AI prompts as reusable templates. Create functions like "Translate to Chinese" for one-click access without repetitive input.'
  },
  '截屏功能': {
    title: 'Screenshot Feature',
    description: 'Capture screenshots for text recognition and processing. Seamlessly integrate visual content with text analysis capabilities.'
  },
  '翻译功能': {
    title: 'Translation Feature',
    description: 'Comprehensive translation capabilities supporting multiple languages with high accuracy and context awareness.'
  },
  'Anki自动制卡功能': {
    title: 'Anki Auto Card Creation',
    description: 'Automatically create Anki flashcards from selected content. Streamline your learning process with intelligent card generation.'
  },
  '语音识别功能': {
    title: 'Speech Recognition',
    description: 'Convert speech to text with high accuracy. Support for multiple languages and real-time processing.'
  },
  '智能摘要功能': {
    title: 'AI Summarization',
    description: 'Generate intelligent summaries of long texts using advanced AI algorithms. Extract key points efficiently.'
  },
  '多语言支持': {
    title: 'Multi-language Support',
    description: 'Comprehensive internationalization support for multiple languages and regions with seamless switching.'
  },
  '用户界面优化': {
    title: 'UI/UX Enhancement',
    description: 'Improved user interface and experience with modern design principles and intuitive navigation.'
  }
};

async function generateEnglishTranslations() {
  console.log('🚀 开始生成英文翻译JSON文件...');

  try {
    // 获取所有功能
    const allFeatures = await db
      .select({
        id: features.id,
        title: features.title,
        description: features.description,
        status: features.status,
        priority: features.priority,
        createdAt: features.createdAt
      })
      .from(features)
      .orderBy(features.createdAt);

    console.log(`📊 找到 ${allFeatures.length} 个功能`);

    // 检查已存在的英文翻译
    const existingTranslations = await db
      .select()
      .from(featureTranslations)
      .where(eq(featureTranslations.locale, 'en'));

    const existingMap = new Map(
      existingTranslations.map(t => [t.featureId, t])
    );

    console.log(`📝 已存在 ${existingTranslations.length} 个英文翻译`);

    // 生成翻译数据
    const translations = allFeatures.map(feature => {
      const existing = existingMap.get(feature.id);
      
      // 尝试从预定义翻译中获取
      const predefinedTranslation = TRANSLATIONS[feature.title];
      
      let title: string;
      let description: string;
      
      if (predefinedTranslation) {
        // 使用预定义翻译
        title = predefinedTranslation.title;
        description = predefinedTranslation.description;
      } else if (existing) {
        // 使用现有翻译
        title = existing.title;
        description = existing.description;
      } else {
        // 生成占位符翻译
        title = `[TO TRANSLATE] ${feature.title}`;
        description = `[TO TRANSLATE] ${feature.description}`;
      }

      return {
        featureId: feature.id,
        title,
        description,
        status: existing ? 'existing' : 'new',
        originalTitle: feature.title,
        originalDescription: feature.description
      };
    });

    // 创建最终的JSON结构
    const translationFile = {
      locale: 'en',
      generatedAt: new Date().toISOString(),
      totalFeatures: allFeatures.length,
      existingTranslations: existingTranslations.length,
      newTranslations: translations.filter(t => t.status === 'new').length,
      translations: translations.map(t => ({
        featureId: t.featureId,
        title: t.title,
        description: t.description
      }))
    };

    // 保存到文件
    const outputPath = path.join(process.cwd(), 'en-translations.json');
    fs.writeFileSync(outputPath, JSON.stringify(translationFile, null, 2), 'utf8');

    console.log(`✅ 英文翻译文件已生成: ${outputPath}`);
    console.log(`📈 统计信息:`);
    console.log(`   - 总功能数: ${translationFile.totalFeatures}`);
    console.log(`   - 已有翻译: ${translationFile.existingTranslations}`);
    console.log(`   - 新增翻译: ${translationFile.newTranslations}`);

    // 生成详细报告
    const reportPath = path.join(process.cwd(), 'translation-report.txt');
    const report = [
      '英文翻译生成报告',
      '==================',
      `生成时间: ${new Date().toLocaleString()}`,
      `总功能数: ${translationFile.totalFeatures}`,
      `已有翻译: ${translationFile.existingTranslations}`,
      `新增翻译: ${translationFile.newTranslations}`,
      '',
      '功能详情:',
      '--------'
    ];

    translations.forEach((t, index) => {
      report.push(`${index + 1}. ${t.originalTitle} (${t.status})`);
      report.push(`   英文: ${t.title}`);
      report.push('');
    });

    fs.writeFileSync(reportPath, report.join('\n'), 'utf8');
    console.log(`📋 详细报告已生成: ${reportPath}`);

  } catch (error) {
    console.error('❌ 生成英文翻译失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  generateEnglishTranslations()
    .then(() => {
      console.log('🎉 英文翻译生成完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export { generateEnglishTranslations };
