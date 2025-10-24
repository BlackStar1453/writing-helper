#!/usr/bin/env tsx

/**
 * 列出所有功能的脚本
 * 使用方法: npx tsx scripts/list-features.ts
 */

import { db } from '../lib/db/drizzle';
import { features } from '../lib/db/schema';
import { desc } from 'drizzle-orm';

async function listFeatures() {
  try {
    console.log('🔍 获取功能列表...\n');

    const allFeatures = await db
      .select({
        id: features.id,
        title: features.title,
        description: features.description,
        status: features.status,
        priority: features.priority,
        version: features.version,
        completedAt: features.completedAt,
        createdAt: features.createdAt
      })
      .from(features)
      .orderBy(desc(features.priority), desc(features.createdAt));

    if (allFeatures.length === 0) {
      console.log('❌ 没有找到任何功能');
      return;
    }

    console.log(`📊 找到 ${allFeatures.length} 个功能:\n`);

    // 按状态分组显示
    const groupedFeatures = {
      planned: allFeatures.filter(f => f.status === 'planned'),
      inDevelopment: allFeatures.filter(f => f.status === 'inDevelopment'),
      completed: allFeatures.filter(f => f.status === 'completed')
    };

    const statusLabels = {
      planned: '📋 计划中',
      inDevelopment: '🔧 开发中',
      completed: '✅ 已完成'
    };

    for (const [status, statusFeatures] of Object.entries(groupedFeatures)) {
      if (statusFeatures.length === 0) continue;

      console.log(`${statusLabels[status as keyof typeof statusLabels]} (${statusFeatures.length} 个):`);
      console.log('─'.repeat(50));

      statusFeatures.forEach((feature, index) => {
        console.log(`${index + 1}. ${feature.title}`);
        console.log(`   ID: ${feature.id}`);
        console.log(`   状态: ${feature.status}`);
        console.log(`   优先级: ${feature.priority}`);
        if (feature.version) {
          console.log(`   版本: ${feature.version}`);
        }
        if (feature.completedAt) {
          console.log(`   完成时间: ${new Date(feature.completedAt).toLocaleDateString()}`);
        }
        console.log(`   创建时间: ${new Date(feature.createdAt).toLocaleDateString()}`);
        console.log(`   描述: ${feature.description.substring(0, 100)}${feature.description.length > 100 ? '...' : ''}`);
        console.log('');
      });

      console.log('');
    }

    // 显示使用提示
    console.log('💡 使用提示:');
    console.log('   复制功能ID来为特定功能生成翻译:');
    console.log('   npx tsx scripts/generate-feature-translations.ts --feature-id <ID> --locale zh,ja,ko');
    console.log('');
    console.log('   为所有功能生成翻译:');
    console.log('   npx tsx scripts/generate-feature-translations.ts --all --locale zh,ja,ko');

  } catch (error) {
    console.error('❌ 获取功能列表失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  listFeatures().catch(console.error);
}

export { listFeatures };
