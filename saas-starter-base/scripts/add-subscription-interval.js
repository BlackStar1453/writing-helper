#!/usr/bin/env node

/**
 * 添加subscription_interval字段的脚本
 */

import { db } from '../lib/db/drizzle.ts';
import { sql } from 'drizzle-orm';

async function addSubscriptionIntervalField() {
  console.log('🔧 开始添加subscription_interval字段...');
  
  try {
    // 1. 检查字段是否已存在
    console.log('📋 检查字段是否已存在...');
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'subscription_interval'
    `);
    
    if (checkResult.length > 0) {
      console.log('✅ subscription_interval字段已存在，跳过创建');
      return;
    }
    
    // 2. 添加字段
    console.log('➕ 添加subscription_interval字段...');
    await db.execute(sql`
      ALTER TABLE "users" ADD COLUMN "subscription_interval" varchar(10)
    `);
    console.log('✅ 字段添加成功');
    
    // 3. 为现有用户设置默认值
    console.log('🔄 为现有用户设置默认值...');
    
    // 为活跃订阅用户设置为月付
    const activeUsersResult = await db.execute(sql`
      UPDATE "users" 
      SET "subscription_interval" = 'month' 
      WHERE "subscription_status" = 'active' AND "subscription_interval" IS NULL
    `);
    console.log(`✅ 为 ${activeUsersResult.rowCount || 0} 个活跃用户设置为月付`);
    
    // 为lifetime用户设置为null
    const lifetimeUsersResult = await db.execute(sql`
      UPDATE "users" 
      SET "subscription_interval" = NULL 
      WHERE "subscription_status" = 'lifetime'
    `);
    console.log(`✅ 为 ${lifetimeUsersResult.rowCount || 0} 个lifetime用户设置为null`);
    
    // 4. 验证结果
    console.log('🔍 验证结果...');
    const verifyResult = await db.execute(sql`
      SELECT 
        subscription_status,
        subscription_interval,
        COUNT(*) as count
      FROM "users" 
      WHERE subscription_status IS NOT NULL
      GROUP BY subscription_status, subscription_interval
      ORDER BY subscription_status, subscription_interval
    `);
    
    console.log('📊 用户订阅状态统计:');
    verifyResult.forEach(row => {
      console.log(`   ${row.subscription_status} (${row.subscription_interval || 'null'}): ${row.count} 用户`);
    });
    
    console.log('');
    console.log('🎉 subscription_interval字段添加完成！');
    
  } catch (error) {
    console.error('❌ 添加字段失败:', error);
    throw error;
  }
}

// 运行脚本
addSubscriptionIntervalField()
  .then(() => {
    console.log('✅ 脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });
