#!/usr/bin/env node

/**
 * 部署后初始化脚本
 * 在 Vercel 部署完成后运行，确保预缓存系统正常启动
 */

const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : process.env.BASE_URL || 'http://localhost:3000';

async function waitForDeployment(maxAttempts = 10) {
  console.log('⏳ 等待部署完成...');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/debug/server-status`);
      if (response.ok) {
        console.log('✅ 部署已完成，服务器正在运行');
        return true;
      }
    } catch (error) {
      console.log(`🔄 尝试 ${i + 1}/${maxAttempts}: 服务器尚未就绪...`);
    }
    
    // 等待 5 秒后重试
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.error('❌ 等待部署超时');
  return false;
}

async function warmupServer() {
  console.log('🔥 开始服务器预热...');
  
  try {
    // 调用几个关键端点来触发初始化
    const endpoints = [
      '/api/debug/server-status',
      '/api/user/warmup',
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📡 预热端点: ${endpoint}`);
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: endpoint.includes('warmup') ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // 对于需要认证的端点，这里会失败，但仍然会触发初始化
        });
        
        console.log(`✅ ${endpoint} - 状态: ${response.status}`);
      } catch (error) {
        console.log(`⚠️ ${endpoint} - 错误: ${error.message}`);
      }
    }
    
    console.log('✅ 服务器预热完成');
  } catch (error) {
    console.error('❌ 服务器预热失败:', error);
  }
}

async function checkPrecacheStatus() {
  console.log('🔍 检查预缓存状态...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/debug/server-status`);
    const data = await response.json();
    
    console.log('📊 预缓存状态:');
    console.log(`  - 启用状态: ${data.precache?.enabled ? '✅' : '❌'}`);
    console.log(`  - 服务器就绪: ${data.server?.isReady ? '✅' : '❌'}`);
    console.log(`  - Redis 连接: ${data.services?.redis === 'connected' ? '✅' : '❌'}`);
    console.log(`  - 数据库连接: ${data.services?.database === 'connected' ? '✅' : '❌'}`);
    
    if (data.precache?.enabled && data.server?.isReady) {
      console.log('🎉 预缓存系统运行正常！');
      return true;
    } else {
      console.log('⚠️ 预缓存系统可能未正常启动');
      return false;
    }
  } catch (error) {
    console.error('❌ 检查预缓存状态失败:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 开始部署后初始化');
  console.log(`🎯 目标 URL: ${BASE_URL}`);
  console.log('');
  
  // 1. 等待部署完成
  const deploymentReady = await waitForDeployment();
  if (!deploymentReady) {
    process.exit(1);
  }
  console.log('');
  
  // 2. 预热服务器
  await warmupServer();
  console.log('');
  
  // 3. 等待一段时间让初始化完成
  console.log('⏳ 等待初始化完成...');
  await new Promise(resolve => setTimeout(resolve, 10000)); // 等待 10 秒
  console.log('');
  
  // 4. 检查预缓存状态
  const precacheOk = await checkPrecacheStatus();
  console.log('');
  
  if (precacheOk) {
    console.log('🎉 部署后初始化完成！');
    process.exit(0);
  } else {
    console.log('⚠️ 部署后初始化完成，但预缓存系统可能需要手动启动');
    console.log('💡 建议：访问管理面板手动触发预缓存');
    process.exit(0);
  }
}

// 运行初始化
main().catch(error => {
  console.error('❌ 部署后初始化失败:', error);
  process.exit(1);
});
