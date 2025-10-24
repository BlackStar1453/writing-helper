#!/usr/bin/env node

/**
 * 为现有用户设置subscription_interval默认值
 */

import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

async function updateSubscriptionIntervals() {
  console.log('🔧 开始为现有用户设置subscription_interval默认值...');
  
  try {
    // 1. 查看当前用户状态
    console.log('📋 查看当前用户订阅状态...');
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        subscriptionStatus: users.subscriptionStatus,
        subscriptionInterval: users.subscriptionInterval,
        planName: users.planName
      })
      .from(users)
      .where(isNull(users.deletedAt));
    
    console.log(`总用户数: ${allUsers.length}`);
    
    const statusCounts = allUsers.reduce((acc, user) => {
      const status = user.subscriptionStatus || 'null';
      const interval = user.subscriptionInterval || 'null';
      const key = `${status}(${interval})`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('当前用户状态分布:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} 用户`);
    });
    
    // 2. 为活跃订阅用户设置为月付（假设现有用户都是月付）
    console.log('\n🔄 为活跃订阅用户设置为月付...');
    const activeUsersResult = await db
      .update(users)
      .set({ subscriptionInterval: 'month' })
      .where(
        and(
          eq(users.subscriptionStatus, 'active'),
          isNull(users.subscriptionInterval)
        )
      )
      .returning({
        id: users.id,
        email: users.email,
        planName: users.planName
      });
    
    console.log(`✅ 为 ${activeUsersResult.length} 个活跃用户设置为月付`);
    activeUsersResult.forEach(user => {
      console.log(`  - ${user.email} (${user.planName})`);
    });
    
    // 3. 为lifetime用户确保设置为null
    console.log('\n🔄 为lifetime用户设置为null...');
    const lifetimeUsersResult = await db
      .update(users)
      .set({ subscriptionInterval: null })
      .where(eq(users.subscriptionStatus, 'lifetime'))
      .returning({
        id: users.id,
        email: users.email,
        planName: users.planName
      });
    
    console.log(`✅ 为 ${lifetimeUsersResult.length} 个lifetime用户设置为null`);
    lifetimeUsersResult.forEach(user => {
      console.log(`  - ${user.email} (${user.planName})`);
    });
    
    // 4. 验证最终结果
    console.log('\n🔍 验证最终结果...');
    const finalUsers = await db
      .select({
        subscriptionStatus: users.subscriptionStatus,
        subscriptionInterval: users.subscriptionInterval,
        count: users.id
      })
      .from(users)
      .where(isNull(users.deletedAt));
    
    const finalCounts = finalUsers.reduce((acc, user) => {
      const status = user.subscriptionStatus || 'null';
      const interval = user.subscriptionInterval || 'null';
      const key = `${status}(${interval})`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 最终用户状态分布:');
    Object.entries(finalCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} 用户`);
    });
    
    console.log('\n🎉 subscription_interval字段设置完成！');
    
  } catch (error) {
    console.error('❌ 设置默认值失败:', error);
    throw error;
  }
}

// 运行脚本
if (require.main === module) {
  updateSubscriptionIntervals()
    .then(() => {
      console.log('✅ 脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    });
}

export { updateSubscriptionIntervals };
