#!/usr/bin/env node

/**
 * 检查资源可用性脚本
 * 验证CDN和本地资源的可用性
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const CDN_BASE_URL = process.env.NEXT_PUBLIC_ASSETS_CDN_URL || 'https://assets.yourdomain.com';
const LOCAL_BASE_PATH = 'public';

// 需要检查的资源
const ASSETS_TO_CHECK = [
  // GIF文件
  'gifs/elick-demo-zh.gif',
  'gifs/elick-demo-en.gif',
  'gifs/paper-dictionary.gif',
  'gifs/electronic-dictionary.gif',
  'gifs/chatgpt-lookup.gif',
  
  // 图片文件
  'images/logo.png',
  'images/dictionary-example.png',
  
  // 其他资源
  'icons/favicon.ico'
];

/**
 * 检查URL是否可访问
 */
function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        available: res.statusCode >= 200 && res.statusCode < 400,
        size: res.headers['content-length'] || 'unknown'
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        status: 0,
        available: false,
        error: error.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        available: false,
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

/**
 * 检查本地文件是否存在
 */
function checkLocalFile(filePath) {
  const fullPath = path.join(LOCAL_BASE_PATH, filePath);
  
  try {
    const stats = fs.statSync(fullPath);
    return {
      path: filePath,
      available: true,
      size: stats.size,
      lastModified: stats.mtime
    };
  } catch (error) {
    return {
      path: filePath,
      available: false,
      error: error.message
    };
  }
}

/**
 * 检查所有资源
 */
async function checkAllAssets() {
  console.log('🔍 开始检查资源可用性...\n');
  
  const results = {
    cdn: [],
    local: [],
    summary: {
      cdnAvailable: 0,
      cdnTotal: 0,
      localAvailable: 0,
      localTotal: 0
    }
  };
  
  // 检查CDN资源
  console.log('📡 检查CDN资源:');
  for (const asset of ASSETS_TO_CHECK) {
    const cdnUrl = `${CDN_BASE_URL}/${asset}`;
    const result = await checkUrl(cdnUrl);
    
    results.cdn.push(result);
    results.summary.cdnTotal++;
    
    if (result.available) {
      results.summary.cdnAvailable++;
      console.log(`  ✅ ${asset} (${result.size} bytes)`);
    } else {
      console.log(`  ❌ ${asset} - ${result.error || `HTTP ${result.status}`}`);
    }
  }
  
  console.log('\n📁 检查本地资源:');
  for (const asset of ASSETS_TO_CHECK) {
    const result = checkLocalFile(asset);
    
    results.local.push(result);
    results.summary.localTotal++;
    
    if (result.available) {
      results.summary.localAvailable++;
      console.log(`  ✅ ${asset} (${result.size} bytes)`);
    } else {
      console.log(`  ❌ ${asset} - ${result.error}`);
    }
  }
  
  return results;
}

/**
 * 显示汇总报告
 */
function showSummary(results) {
  console.log('\n📊 汇总报告:');
  console.log('─'.repeat(50));
  
  const cdnRate = (results.summary.cdnAvailable / results.summary.cdnTotal * 100).toFixed(1);
  const localRate = (results.summary.localAvailable / results.summary.localTotal * 100).toFixed(1);
  
  console.log(`CDN资源:    ${results.summary.cdnAvailable}/${results.summary.cdnTotal} (${cdnRate}%)`);
  console.log(`本地资源:   ${results.summary.localAvailable}/${results.summary.localTotal} (${localRate}%)`);
  
  // 建议
  console.log('\n💡 建议:');
  
  if (results.summary.cdnAvailable === 0) {
    console.log('  ⚠️  CDN资源全部不可用，请检查:');
    console.log('     1. CDN域名配置是否正确');
    console.log('     2. 资源是否已上传到R2');
    console.log('     3. 自定义域名是否已配置');
  } else if (results.summary.cdnAvailable < results.summary.cdnTotal) {
    console.log('  ⚠️  部分CDN资源不可用，建议上传缺失的文件');
  } else {
    console.log('  ✅ CDN资源全部可用');
  }
  
  if (results.summary.localAvailable < results.summary.localTotal) {
    console.log('  ⚠️  部分本地资源缺失，这可能影响回退功能');
  } else {
    console.log('  ✅ 本地资源全部可用');
  }
}

/**
 * 生成详细报告
 */
function generateReport(results) {
  const reportPath = 'assets-check-report.json';
  
  const report = {
    timestamp: new Date().toISOString(),
    cdnBaseUrl: CDN_BASE_URL,
    localBasePath: LOCAL_BASE_PATH,
    results,
    recommendations: []
  };
  
  // 添加建议
  if (results.summary.cdnAvailable === 0) {
    report.recommendations.push('Setup CDN and upload assets');
  }
  
  if (results.summary.localAvailable < results.summary.localTotal) {
    report.recommendations.push('Add missing local assets for fallback');
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
}

/**
 * 主函数
 */
async function main() {
  try {
    const results = await checkAllAssets();
    showSummary(results);
    generateReport(results);
    
    // 退出码
    const hasIssues = results.summary.cdnAvailable < results.summary.cdnTotal || 
                     results.summary.localAvailable < results.summary.localTotal;
    
    process.exit(hasIssues ? 1 : 0);
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkUrl,
  checkLocalFile,
  checkAllAssets
};
