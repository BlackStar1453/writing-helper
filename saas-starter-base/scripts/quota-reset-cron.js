#!/usr/bin/env node

/**
 * 定时任务：用户额度重置
 * 建议每天运行一次，自动重置需要重置额度的用户
 * 
 * 使用方法：
 * 1. 手动运行: node scripts/quota-reset-cron.js
 * 2. 添加到crontab: 0 2 * * * /path/to/node /path/to/scripts/quota-reset-cron.js
 */

import { runQuotaResetJob } from '../lib/subscription-renewal.js';

async function main() {
  console.log('🕐 开始执行定时额度重置任务...');
  console.log('时间:', new Date().toISOString());
  console.log('');

  try {
    const result = await runQuotaResetJob();
    
    console.log('✅ 定时任务执行完成');
    console.log('📊 执行结果:');
    console.log(`   - 检查用户数: ${result.totalChecked}`);
    console.log(`   - 重置用户数: ${result.totalReset}`);
    console.log(`   - 错误数量: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('❌ 错误详情:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('');
    console.log('🎉 定时任务执行成功');
    
    // 如果有重置的用户，发送通知（可选）
    if (result.totalReset > 0) {
      console.log(`📧 建议发送通知: 已为 ${result.totalReset} 个用户重置了额度`);
    }
    
  } catch (error) {
    console.error('❌ 定时任务执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('🏁 定时任务结束');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 定时任务崩溃:', error);
      process.exit(1);
    });
}

export { main as runQuotaResetCron };
