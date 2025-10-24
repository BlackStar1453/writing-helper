import { db } from '../lib/db/drizzle';
import { features, featureTranslations } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// 现有中文功能对应的英文翻译
const CHINESE_TO_ENGLISH_TRANSLATIONS: Record<string, { title: string; description: string }> = {
  'Speak功能': {
    title: 'Text-to-Speech Feature',
    description: 'Uses TTS for pronunciation with customizable speech rate and different accents. Supports multiple languages and natural voice synthesis.'
  },
  'YouGlish功能': {
    title: 'YouGlish Integration',
    description: 'Search for authentic pronunciation directly from YouTube videos. Learn correct pronunciation and usage context through real video content.'
  },
  '选取单词直接获取上下文功能': {
    title: 'Word Selection Context Feature',
    description: 'Directly get the sentence context when selecting words in any area. Intelligently recognizes context for more accurate understanding.'
  },
  'Prompt设置': {
    title: 'Prompt Templates',
    description: 'Save commonly used AI prompts as reusable templates. For example, create a "Translate to Chinese" function for one-click activation without repetitive input.'
  },
  '截屏功能': {
    title: 'Screenshot Feature',
    description: 'Take screenshots in any area, and the system automatically captures the context around the screenshot area. Effective when word selection is not possible (e.g., in videos).'
  },
  '翻译功能': {
    title: 'Translation Feature',
    description: 'Use AI to translate after selecting any area and clicking the built-in translation button. You can freely configure translation settings and target languages in the function manager.'
  },
  'Anki自动制卡功能': {
    title: 'Anki Auto Card Creation',
    description: 'Automatically create appropriately formatted cards from selected content and add them to Anki. Monitor Anki settings status, support automatic and manual adding modes, configurable target deck.'
  },
  'Anki对话记录集成': {
    title: 'Anki Conversation Integration',
    description: 'Directly add conversation records to Anki, then implement an Anki plugin that can continue conversations based on conversation records. Use selected content as deck front, Q&A as text content.'
  },
  '思考模型适配': {
    title: 'Reasoning Model Adaptation',
    description: 'Adapt reasoning models to handle multiple related contexts simultaneously. Use reasoning models for complex problems, select multiple related contexts for deep analysis.'
  },
  '单词本功能': {
    title: 'Vocabulary Book Feature',
    description: 'Add words or any content that needs learning and review to the vocabulary book. Integrate with Infinite Craft, combine with Anki functionality, support one-click addition of unadded words.'
  },
  '快速搜索功能': {
    title: 'Quick Search Feature',
    description: 'When there are many created functions, it may be difficult to find the needed function quickly. Use search to quickly invoke functions, such as @translate to quickly call the translation function.'
  },
  'Windows支持': {
    title: 'Windows Support',
    description: 'Full Windows operating system support with native integration and optimized performance for Windows users.'
  }
};

async function addFeatureTranslations() {
  console.log('🚀 开始处理功能多语言设置...');
  console.log('📝 当前功能为中文，将为它们创建英文翻译');

  try {
    // 获取所有现有功能
    const existingFeatures = await db
      .select()
      .from(features)
      .orderBy(features.createdAt);

    console.log(`📊 找到 ${existingFeatures.length} 个功能`);

    for (const feature of existingFeatures) {
      console.log(`\n🔄 处理功能: "${feature.title}"`);

      // 查找对应的英文翻译
      const englishTranslation = CHINESE_TO_ENGLISH_TRANSLATIONS[feature.title];

      if (englishTranslation) {
        // 检查是否已存在英文翻译
        const existingEnTranslation = await db
          .select()
          .from(featureTranslations)
          .where(
            eq(featureTranslations.featureId, feature.id) &&
            eq(featureTranslations.locale, 'en')
          )
          .limit(1);

        if (existingEnTranslation.length === 0) {
          // 添加英文翻译
          await db.insert(featureTranslations).values({
            featureId: feature.id,
            locale: 'en',
            title: englishTranslation.title,
            description: englishTranslation.description
          });

          console.log(`  ✅ 已添加英文翻译: ${englishTranslation.title}`);
        } else {
          console.log(`  ⏭️  英文翻译已存在: ${englishTranslation.title}`);
        }
      } else {
        console.log(`  ⚠️  未找到功能 "${feature.title}" 的英文翻译数据`);
      }
    }

    console.log('\n🎉 翻译处理完成！');
    console.log('📋 总结:');
    console.log('  - 原始功能数据保持为中文');
    console.log('  - 已为每个功能添加对应的英文翻译');
    console.log('  - 用户访问时会根据语言设置显示对应版本');

  } catch (error) {
    console.error('❌ 处理翻译失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addFeatureTranslations()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

export { addFeatureTranslations };
