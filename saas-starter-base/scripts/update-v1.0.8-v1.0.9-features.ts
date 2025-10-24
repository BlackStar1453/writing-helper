#!/usr/bin/env tsx

import { db } from '../lib/db/drizzle';
import { features, featureTranslations } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function updateFeatures() {
  console.log('🚀 开始更新v1.0.8和v1.0.9功能...');

  try {
    // 1. 删除旧的"本地模型支持"功能
    console.log('\n🗑️  删除旧的"本地模型支持"功能...');
    const oldFeatureId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
    
    // 先删除翻译
    await db
      .delete(featureTranslations)
      .where(eq(featureTranslations.featureId, oldFeatureId));
    
    // 再删除功能
    const deleteResult = await db
      .delete(features)
      .where(eq(features.id, oldFeatureId));
    
    console.log('✅ 已删除旧的"本地模型支持"功能');

    // 2. 更新v1.0.8功能
    console.log('\n📝 更新v1.0.8功能...');
    const v108Id = 'f1a2b3c4-d5e6-4789-a012-345678901abc';
    
    await db
      .update(features)
      .set({
        title: '通过Agent创建自定义功能',
        description: '用户可以通过设置中的创建功能按钮或操作栏中的+号键打开对话，通过与AI对话来创建自己需要的自定义功能。这个功能让用户能够根据自己的需求定制专属的AI助手功能，无需编程知识即可创建个性化的工作流。',
        completedAt: new Date('2025-10-05'),
        updatedAt: new Date()
      })
      .where(eq(features.id, v108Id));
    
    console.log('✅ 已更新v1.0.8功能标题和完成时间');

    // 更新v1.0.8的中文翻译
    await db
      .update(featureTranslations)
      .set({
        title: '通过Agent创建自定义功能',
        description: '用户可以通过设置中的创建功能按钮或操作栏中的+号键打开对话，通过与AI对话来创建自己需要的自定义功能。这个功能让用户能够根据自己的需求定制专属的AI助手功能，无需编程知识即可创建个性化的工作流。',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(featureTranslations.featureId, v108Id),
          eq(featureTranslations.locale, 'zh')
        )
      );

    // 更新v1.0.8的英文翻译
    await db
      .update(featureTranslations)
      .set({
        title: 'Create Custom Features via Agent',
        description: 'Users can open a dialog by clicking the Create Feature button in settings or the + button in the action bar, and create custom functions through AI conversation. This feature allows users to customize their own AI assistant functions according to their needs, creating personalized workflows without programming knowledge.',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(featureTranslations.featureId, v108Id),
          eq(featureTranslations.locale, 'en')
        )
      );

    console.log('✅ 已更新v1.0.8的中英文翻译');

    // 3. 更新v1.0.9功能
    console.log('\n📝 更新v1.0.9功能...');
    const v109Id = 'a2b3c4d5-e6f7-4890-b123-456789012bcd';
    
    await db
      .update(features)
      .set({
        completedAt: new Date('2025-10-07'),
        updatedAt: new Date()
      })
      .where(eq(features.id, v109Id));
    
    console.log('✅ 已更新v1.0.9功能完成时间');

    console.log('\n🎉 所有更新完成!');
    console.log('\n📋 更新摘要:');
    console.log('  ✅ 删除了旧的"本地模型支持"功能');
    console.log('  ✅ v1.0.8: 标题改为"通过Agent创建自定义功能"，完成时间改为2025-10-05');
    console.log('  ✅ v1.0.9: 完成时间改为2025-10-07');
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  updateFeatures()
    .then(() => {
      console.log('\n✨ 脚本执行完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export { updateFeatures };

