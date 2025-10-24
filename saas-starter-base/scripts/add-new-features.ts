#!/usr/bin/env tsx

import { db } from '../lib/db/drizzle';
import { features } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// 新功能数据
const newFeatures = [
  {
    id: 'a1b2c3d4-e5f6-4890-b234-567890abcdef',
    title: '本地模型支持',
    description: '新增对本地AI模型的支持，让用户可以在本地运行AI功能。使用本地模型后不再需要联网和付费，完全离线使用，保护隐私数据。但可能需要较高的本地电脑配置来确保流畅运行。',
    status: 'planned' as const,
    priority: 8
  },
  {
    id: 'b2c3d4e5-f6a7-4901-a345-678901bcdef0',
    title: '图片处理功能',
    description: '支持从剪贴板中获取图片以及上传本地图片文件。可以对图片进行OCR文字识别、图片内容分析、图片翻译等AI处理，为多媒体内容提供智能分析能力。',
    status: 'planned' as const,
    priority: 7
  }
];

async function addNewFeatures() {
  console.log('🚀 开始添加新功能...');

  try {
    for (const feature of newFeatures) {
      console.log(`\n📝 添加功能: "${feature.title}"`);
      
      // 检查功能是否已存在
      const existing = await db
        .select()
        .from(features)
        .where(eq(features.id, feature.id))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⚠️  功能已存在，跳过: ${feature.title}`);
        continue;
      }

      // 插入新功能
      await db.insert(features).values({
        id: feature.id,
        title: feature.title,
        description: feature.description,
        status: feature.status,
        priority: feature.priority
      });

      console.log(`✅ 成功添加功能: ${feature.title}`);
    }

    console.log('\n🎉 所有新功能添加完成!');
    
  } catch (error) {
    console.error('❌ 添加功能失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  addNewFeatures()
    .then(() => {
      console.log('✨ 脚本执行完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export { addNewFeatures };
