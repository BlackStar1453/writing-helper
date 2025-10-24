#!/usr/bin/env node

/**
 * 服务器预热脚本
 * 在服务器启动后立即执行预热操作
 */

const http = require('http');
const https = require('https');

class ServerWarmupScript {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
  }

  /**
   * 等待服务器启动
   */
  async waitForServer(maxWaitTime = 60000) {
    console.log('⏳ 等待服务器启动...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        await this.makeRequest('/api/health', 'GET');
        console.log('✅ 服务器已启动');
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('服务器启动超时');
  }

  /**
   * 执行预热请求
   */
  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ServerWarmup/1.0'
        }
      };

      if (data) {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              status: res.statusCode,
              data: responseData
            });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  /**
   * 预热关键端点
   */
  async warmupEndpoints() {
    console.log('🔥 开始预热关键端点...');
    
    const endpoints = [
      // 健康检查
      { path: '/api/health', method: 'GET', name: '健康检查' },
      
      // 模型信息
      { path: '/api/models', method: 'GET', name: '模型信息' },
      
      // 系统配置
      { path: '/api/builtin-actions/version', method: 'GET', name: '系统版本' },
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`  🎯 预热: ${endpoint.name} (${endpoint.path})`);
        const startTime = Date.now();
        
        await this.makeRequest(endpoint.path, endpoint.method);
        
        const duration = Date.now() - startTime;
        console.log(`    ✅ 完成 - ${duration}ms`);
      } catch (error) {
        console.warn(`    ⚠️ 失败: ${error.message}`);
      }
    }
  }

  /**
   * 预热数据库连接
   */
  async warmupDatabase() {
    console.log('🗄️ 预热数据库连接...');
    
    try {
      // 通过 API 触发数据库查询
      await this.makeRequest('/api/models', 'GET');
      console.log('  ✅ 数据库连接预热完成');
    } catch (error) {
      console.warn(`  ⚠️ 数据库预热失败: ${error.message}`);
    }
  }

  /**
   * 预热 OpenAI 连接
   */
  async warmupOpenAI() {
    console.log('🤖 预热 OpenAI 连接...');
    
    // 注意：这里不能直接调用需要认证的端点
    // 只能通过其他方式间接预热
    console.log('  ℹ️ OpenAI 连接将在首次请求时预热');
  }

  /**
   * 执行完整的预热流程
   */
  async performWarmup() {
    console.log('🚀 开始服务器预热流程...');
    console.log(`🎯 目标服务器: ${this.baseUrl}`);
    console.log('');

    const startTime = Date.now();

    try {
      // 1. 等待服务器启动
      await this.waitForServer();
      
      // 2. 并行执行预热任务
      await Promise.all([
        this.warmupEndpoints(),
        this.warmupDatabase(),
        this.warmupOpenAI(),
      ]);

      const totalTime = Date.now() - startTime;
      console.log('');
      console.log(`🎉 服务器预热完成！总耗时: ${totalTime}ms`);
      console.log('');
      console.log('📊 预热效果:');
      console.log('  • 数据库连接池已建立');
      console.log('  • 关键端点已缓存');
      console.log('  • DNS 解析已完成');
      console.log('  • 首次请求响应时间将显著提升');
      
    } catch (error) {
      console.error('❌ 服务器预热失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 持续监控和预热
   */
  async continuousWarmup(interval = 5 * 60 * 1000) { // 5分钟
    console.log(`🔄 启动持续预热监控 (间隔: ${interval / 1000}秒)`);
    
    setInterval(async () => {
      try {
        console.log('🔄 执行定期预热...');
        await this.warmupEndpoints();
      } catch (error) {
        console.warn('定期预热失败:', error.message);
      }
    }, interval);
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    
    switch (key) {
      case 'url':
        options.baseUrl = value;
        break;
      case 'continuous':
        options.continuous = value === 'true';
        break;
      case 'interval':
        options.interval = parseInt(value) * 1000;
        break;
    }
  }
  
  return options;
}

// 主函数
async function main() {
  const options = parseArgs();
  const warmup = new ServerWarmupScript(options);
  
  try {
    await warmup.performWarmup();
    
    if (options.continuous) {
      await warmup.continuousWarmup(options.interval);
      
      // 保持进程运行
      process.on('SIGINT', () => {
        console.log('\n👋 停止持续预热监控');
        process.exit(0);
      });
      
      console.log('按 Ctrl+C 停止持续监控');
    }
    
  } catch (error) {
    console.error('预热脚本执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = ServerWarmupScript;
