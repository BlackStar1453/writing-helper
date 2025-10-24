#!/usr/bin/env node

/**
 * 性能测试脚本
 * 用于测试使用量同步系统的性能影响
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// 测试用户数据
const TEST_USER = {
  email: "1519235462@qq.com",
  expiresDate: 1757856376051,
  id: "1675524b-820b-478f-b841-f94aaffac413",
  plan: "Premium",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxNjc1NTI0Yi04MjBiLTQ3OGYtYjg0MS1mOTRhYWZmYWM0MTMiLCJlbWFpbCI6IjE1MTkyMzU0NjJAcXEuY29tIiwibmFtZSI6IiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NTI2NDM3NiwiZXhwIjoxNzU3ODU2Mzc2fQ.aINbw38-uYbToB1MIeqR-X4J123ETSanRWyM9Jwfi6k"
};

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER.token}`,
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ 请求失败 ${url}:`, error.message);
    throw error;
  }
}

async function getPerformanceStats() {
  console.log('\n📊 获取性能统计...');
  
  try {
    const result = await makeRequest(`${BASE_URL}/api/admin/users-usage`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'check_sync_manager'
      })
    });
    
    return result.data.syncManagerStatus.performance;
  } catch (error) {
    console.error('❌ 获取性能统计失败:', error.message);
    return null;
  }
}

async function resetPerformanceStats() {
  console.log('\n🔄 重置性能统计...');
  
  try {
    const result = await makeRequest(`${BASE_URL}/api/admin/users-usage`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'reset_performance_stats'
      })
    });
    
    console.log('✅ 性能统计已重置');
    return true;
  } catch (error) {
    console.error('❌ 重置性能统计失败:', error.message);
    return false;
  }
}

async function simulateLoad(requests = 10, interval = 1000) {
  console.log(`\n🚀 模拟负载测试: ${requests} 个请求，间隔 ${interval}ms`);
  
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < requests; i++) {
    try {
      console.log(`📤 发送第 ${i + 1}/${requests} 个请求...`);
      
      const response = await fetch(`${BASE_URL}/api/hasNotEngine-ultra-fast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER.token}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          query: `Performance test query ${i + 1}`,
          stream: false
        })
      });
      
      if (response.ok) {
        successCount++;
        console.log(`✅ 请求 ${i + 1} 成功`);
      } else {
        errorCount++;
        console.log(`❌ 请求 ${i + 1} 失败: ${response.status}`);
      }
      
      // 等待间隔
      if (i < requests - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
    } catch (error) {
      errorCount++;
      console.error(`❌ 请求 ${i + 1} 异常:`, error.message);
    }
  }
  
  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / requests;
  
  console.log(`\n📊 负载测试结果:`);
  console.log(`  - 总请求数: ${requests}`);
  console.log(`  - 成功请求: ${successCount}`);
  console.log(`  - 失败请求: ${errorCount}`);
  console.log(`  - 总耗时: ${totalTime}ms`);
  console.log(`  - 平均耗时: ${avgTime.toFixed(2)}ms`);
  console.log(`  - 成功率: ${((successCount / requests) * 100).toFixed(2)}%`);
  
  return {
    totalRequests: requests,
    successCount,
    errorCount,
    totalTime,
    avgTime,
    successRate: (successCount / requests) * 100
  };
}

async function monitorSystemResources() {
  console.log('\n🖥️ 监控系统资源...');
  
  try {
    // 获取Node.js进程信息
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    console.log('📊 系统资源状态:');
    console.log(`  - 内存使用:`);
    console.log(`    - RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    - Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    - Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    - External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - CPU使用:`);
    console.log(`    - User: ${cpuUsage.user} 微秒`);
    console.log(`    - System: ${cpuUsage.system} 微秒`);
    
    return {
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      cpu: cpuUsage
    };
  } catch (error) {
    console.error('❌ 获取系统资源信息失败:', error);
    return null;
  }
}

async function runPerformanceTest() {
  try {
    console.log('🎯 开始性能测试...');
    console.log(`📊 测试环境: ${process.env.NODE_ENV || 'development'}`);
    
    // 1. 获取初始性能统计
    console.log('\n=== 第1步: 获取初始状态 ===');
    const initialStats = await getPerformanceStats();
    console.log('📊 初始性能统计:', initialStats);
    
    const initialResources = await monitorSystemResources();
    
    // 2. 重置性能统计
    console.log('\n=== 第2步: 重置性能统计 ===');
    await resetPerformanceStats();
    
    // 3. 执行负载测试
    console.log('\n=== 第3步: 执行负载测试 ===');
    const loadTestResult = await simulateLoad(20, 500); // 20个请求，间隔500ms
    
    // 4. 等待同步完成
    console.log('\n=== 第4步: 等待同步完成 ===');
    console.log('⏰ 等待30秒让同步系统处理...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 5. 获取最终性能统计
    console.log('\n=== 第5步: 获取最终统计 ===');
    const finalStats = await getPerformanceStats();
    console.log('📊 最终性能统计:', finalStats);
    
    const finalResources = await monitorSystemResources();
    
    // 6. 分析结果
    console.log('\n=== 性能分析结果 ===');
    
    if (finalStats) {
      console.log('🔄 同步性能:');
      console.log(`  - 总同步次数: ${finalStats.totalSyncs}`);
      console.log(`  - 平均同步时间: ${finalStats.avgSyncTime}ms`);
      console.log(`  - 错误率: ${finalStats.errorRate}%`);
      console.log(`  - 每小时同步次数: ${finalStats.syncPerHour}`);
      console.log(`  - 运行时间: ${finalStats.uptimeHours}小时`);
    }
    
    console.log('\n📊 负载测试结果:');
    console.log(`  - 请求成功率: ${loadTestResult.successRate.toFixed(2)}%`);
    console.log(`  - 平均响应时间: ${loadTestResult.avgTime.toFixed(2)}ms`);
    
    if (initialResources && finalResources) {
      console.log('\n💾 资源使用变化:');
      const memoryDiff = finalResources.memory.heapUsed - initialResources.memory.heapUsed;
      console.log(`  - 内存变化: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // 7. 性能评估
    console.log('\n=== 性能评估 ===');
    
    let performanceGrade = 'A';
    const issues = [];
    
    if (finalStats) {
      if (finalStats.avgSyncTime > 3000) {
        performanceGrade = 'C';
        issues.push('同步时间过长 (>3秒)');
      } else if (finalStats.avgSyncTime > 1000) {
        performanceGrade = 'B';
        issues.push('同步时间较长 (>1秒)');
      }
      
      if (finalStats.errorRate > 5) {
        performanceGrade = 'C';
        issues.push('错误率过高 (>5%)');
      } else if (finalStats.errorRate > 1) {
        performanceGrade = 'B';
        issues.push('错误率较高 (>1%)');
      }
    }
    
    if (loadTestResult.successRate < 95) {
      performanceGrade = 'C';
      issues.push('请求成功率过低 (<95%)');
    } else if (loadTestResult.successRate < 99) {
      performanceGrade = 'B';
      issues.push('请求成功率较低 (<99%)');
    }
    
    console.log(`🎯 性能等级: ${performanceGrade}`);
    
    if (issues.length > 0) {
      console.log('⚠️ 发现的问题:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ 性能表现良好');
    }
    
    // 8. 建议
    console.log('\n=== 优化建议 ===');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 当前为开发环境，建议:');
      console.log('  - 生产环境将自动使用更保守的配置');
      console.log('  - 同步频率将降低75-80%');
      console.log('  - 详细日志将被禁用');
    } else {
      console.log('📝 生产环境优化建议:');
      if (finalStats && finalStats.avgSyncTime > 2000) {
        console.log('  - 考虑增加SYNC_TIMEOUT配置');
        console.log('  - 检查数据库连接池配置');
      }
      if (finalStats && finalStats.syncPerHour > 100) {
        console.log('  - 考虑增加SYNC_INTERVAL减少同步频率');
        console.log('  - 考虑增加FORCE_SYNC_THRESHOLD减少触发频率');
      }
    }
    
    console.log('\n🎉 性能测试完成！');
    
  } catch (error) {
    console.error('\n❌ 性能测试失败:', error);
    process.exit(1);
  }
}

// 运行性能测试
runPerformanceTest().catch(error => {
  console.error('❌ 性能测试异常:', error);
  process.exit(1);
});
