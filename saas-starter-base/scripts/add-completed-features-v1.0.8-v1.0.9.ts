#!/usr/bin/env tsx

import { db } from '../lib/db/drizzle';
import { features } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// v1.0.8 和 v1.0.9 已完成的功能
const completedFeatures = [
  {
    id: 'f1a2b3c4-d5e6-4789-a012-345678901abc',
    title: '通过Agent创建自定义功能',
    description: '用户可以通过设置中的创建功能按钮或操作栏中的+号键打开对话，通过与AI对话来创建自己需要的自定义功能。这个功能让用户能够根据自己的需求定制专属的AI助手功能，无需编程知识即可创建个性化的工作流。',
    status: 'completed' as const,
    priority: 10,
    version: 'v1.0.8',
    completedAt: new Date('2025-10-05') // 2025年10月5日完成
  },
  {
    id: 'a2b3c4d5-e6f7-4890-b123-456789012bcd',
    title: '本地LLM支持',
    description: '支持使用本地部署的大语言模型，通过Ollama实现完全离线的AI功能。用户可以配置本地LLM服务地址，在保护隐私的同时享受AI助手的便利。本地模型运行不需要联网，数据完全保留在本地，适合对数据安全有高要求的用户。',
    status: 'completed' as const,
    priority: 9,
    version: 'v1.0.9',
    completedAt: new Date('2025-10-07') // 2025年10月7日完成
  }
];

async function addCompletedFeatures() {
  console.log('🚀 开始添加v1.0.8和v1.0.9已完成的功能...');

  try {
    for (const feature of completedFeatures) {
      console.log(`\n📝 添加功能: "${feature.title}" (${feature.version})`);
      
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
        priority: feature.priority,
        version: feature.version,
        completedAt: feature.completedAt
      });

      console.log(`✅ 成功添加功能: ${feature.title} (${feature.version})`);
    }

    console.log('\n🎉 所有已完成功能添加完成!');
    console.log('\n📋 已添加的功能:');
    console.log('  - v1.0.8 (2025-10-05): 通过Agent创建自定义功能');
    console.log('  - v1.0.9 (2025-10-07): 本地LLM支持 (Ollama)');
    
  } catch (error) {
    console.error('❌ 添加功能失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  addCompletedFeatures()
    .then(() => {
      console.log('\n✨ 脚本执行完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export { addCompletedFeatures };

