#!/usr/bin/env tsx

import { db } from '../lib/db/drizzle';
import { features, featureTranslations } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

// v1.0.8 和 v1.0.9 功能的翻译
const featureTranslationsData = [
  {
    featureId: 'f1a2b3c4-d5e6-4789-a012-345678901abc', // v1.0.8
    translations: {
      zh: {
        title: '通过Agent创建自定义功能',
        description: '用户可以通过设置中的创建功能按钮或操作栏中的+号键打开对话，通过与AI对话来创建自己需要的自定义功能。这个功能让用户能够根据自己的需求定制专属的AI助手功能，无需编程知识即可创建个性化的工作流。'
      },
      en: {
        title: 'Create Custom Features via Agent',
        description: 'Users can open a dialog by clicking the Create Feature button in settings or the + button in the action bar, and create custom functions through AI conversation. This feature allows users to customize their own AI assistant functions according to their needs, creating personalized workflows without programming knowledge.'
      }
    }
  },
  {
    featureId: 'a2b3c4d5-e6f7-4890-b123-456789012bcd', // v1.0.9
    translations: {
      zh: {
        title: '本地LLM支持',
        description: '支持使用本地部署的大语言模型，通过Ollama实现完全离线的AI功能。用户可以配置本地LLM服务地址，在保护隐私的同时享受AI助手的便利。本地模型运行不需要联网，数据完全保留在本地，适合对数据安全有高要求的用户。'
      },
      en: {
        title: 'Local LLM Support',
        description: 'Support for locally deployed large language models, enabling fully offline AI functionality through Ollama. Users can configure local LLM service addresses to enjoy AI assistant convenience while protecting privacy. Local models run without internet connection, keeping all data local, ideal for users with high data security requirements.'
      }
    }
  }
];

async function addTranslations() {
  console.log('🚀 开始添加v1.0.8和v1.0.9功能的多语言翻译...');

  try {
    for (const featureData of featureTranslationsData) {
      // 检查功能是否存在
      const feature = await db
        .select()
        .from(features)
        .where(eq(features.id, featureData.featureId))
        .limit(1);

      if (feature.length === 0) {
        console.log(`⚠️  功能 ${featureData.featureId} 不存在，跳过`);
        continue;
      }

      console.log(`\n📝 处理功能: "${feature[0].title}"`);

      // 添加中文翻译
      const zhTranslation = featureData.translations.zh;
      const existingZh = await db
        .select()
        .from(featureTranslations)
        .where(
          and(
            eq(featureTranslations.featureId, featureData.featureId),
            eq(featureTranslations.locale, 'zh')
          )
        )
        .limit(1);

      if (existingZh.length === 0) {
        await db.insert(featureTranslations).values({
          featureId: featureData.featureId,
          locale: 'zh',
          title: zhTranslation.title,
          description: zhTranslation.description
        });
        console.log(`  ✅ 已添加中文翻译: ${zhTranslation.title}`);
      } else {
        console.log(`  ⏭️  中文翻译已存在`);
      }

      // 添加英文翻译
      const enTranslation = featureData.translations.en;
      const existingEn = await db
        .select()
        .from(featureTranslations)
        .where(
          and(
            eq(featureTranslations.featureId, featureData.featureId),
            eq(featureTranslations.locale, 'en')
          )
        )
        .limit(1);

      if (existingEn.length === 0) {
        await db.insert(featureTranslations).values({
          featureId: featureData.featureId,
          locale: 'en',
          title: enTranslation.title,
          description: enTranslation.description
        });
        console.log(`  ✅ 已添加英文翻译: ${enTranslation.title}`);
      } else {
        console.log(`  ⏭️  英文翻译已存在`);
      }
    }

    console.log('\n🎉 所有翻译添加完成!');
    console.log('\n📋 已添加的翻译:');
    console.log('  - v1.0.8: 通过Agent创建自定义功能 / Create Custom Features via Agent');
    console.log('  - v1.0.9: 本地LLM支持 / Local LLM Support');
    
  } catch (error) {
    console.error('❌ 添加翻译失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  addTranslations()
    .then(() => {
      console.log('\n✨ 脚本执行完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export { addTranslations };

