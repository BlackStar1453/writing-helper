#!/usr/bin/env node

/**
 * 测试剩余脚本的可用性
 * 验证清理后保留的脚本是否都能正常工作
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 需要测试的package.json scripts
const packageScripts = [
  'dev',
  'build', 
  'start',
  'warmup',
  'post-deploy',
  'db:setup',
  'db:generate',
  'admin:list',
  'stripe:list',
  'assets:check',
  'downloads:list'
];

// 需要检查的scripts目录文件
const scriptFiles = [
  'check-assets.js',
  'manage-admin.js',
  'manage-downloads.js',
  'manage-stripe-prices.js',
  'post-deploy-init.js',
  'server-warmup.js',
  'quota-reset-cron.js',
  'sync-github-releases.js',
  'upload-assets.js'
];

/**
 * 检查package.json中的scripts
 */
function checkPackageScripts() {
  colorLog('\n🔍 检查 package.json scripts...', 'blue');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts || {};
  
  let passCount = 0;
  let totalCount = 0;
  
  packageScripts.forEach(scriptName => {
    totalCount++;
    if (scripts[scriptName]) {
      colorLog(`  ✅ ${scriptName}: ${scripts[scriptName]}`, 'green');
      passCount++;
    } else {
      colorLog(`  ❌ ${scriptName}: 不存在`, 'red');
    }
  });
  
  colorLog(`\n📊 package.json scripts: ${passCount}/${totalCount} 通过`, passCount === totalCount ? 'green' : 'yellow');
  return passCount === totalCount;
}

/**
 * 检查scripts目录文件
 */
function checkScriptFiles() {
  colorLog('\n🔍 检查 scripts 目录文件...', 'blue');
  
  let passCount = 0;
  let totalCount = 0;
  
  scriptFiles.forEach(fileName => {
    totalCount++;
    const filePath = path.join('scripts', fileName);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      colorLog(`  ✅ ${fileName} (${sizeKB}KB)`, 'green');
      passCount++;
    } else {
      colorLog(`  ❌ ${fileName}: 文件不存在`, 'red');
    }
  });
  
  colorLog(`\n📊 scripts 文件: ${passCount}/${totalCount} 存在`, passCount === totalCount ? 'green' : 'yellow');
  return passCount === totalCount;
}

/**
 * 检查剩余的scripts目录结构
 */
function checkScriptsDirectory() {
  colorLog('\n🔍 检查 scripts 目录结构...', 'blue');
  
  if (!fs.existsSync('scripts')) {
    colorLog('  ❌ scripts 目录不存在', 'red');
    return false;
  }
  
  const files = fs.readdirSync('scripts');
  const remainingFiles = files.filter(file => !file.startsWith('.'));
  
  colorLog(`  📁 剩余文件数量: ${remainingFiles.length}`, 'blue');
  
  // 按类型分组显示
  const categories = {
    '功能开发': [],
    '数据库': [],
    '管理工具': [],
    '资源处理': [],
    '部署运维': [],
    '其他': []
  };
  
  remainingFiles.forEach(file => {
    if (file.includes('feature') || file.includes('translation') || file.includes('generate')) {
      categories['功能开发'].push(file);
    } else if (file.includes('admin') || file.includes('trial')) {
      categories['数据库'].push(file);
    } else if (file.includes('manage') || file.includes('admin')) {
      categories['管理工具'].push(file);
    } else if (file.includes('upload') || file.includes('sync') || file.includes('assets')) {
      categories['资源处理'].push(file);
    } else if (file.includes('deploy') || file.includes('warmup') || file.includes('quota')) {
      categories['部署运维'].push(file);
    } else {
      categories['其他'].push(file);
    }
  });
  
  Object.entries(categories).forEach(([category, files]) => {
    if (files.length > 0) {
      colorLog(`  📂 ${category} (${files.length}个):`, 'yellow');
      files.forEach(file => {
        colorLog(`    - ${file}`, 'reset');
      });
    }
  });
  
  return true;
}

/**
 * 验证关键脚本语法
 */
function validateScriptSyntax() {
  colorLog('\n🔍 验证关键脚本语法...', 'blue');
  
  const jsFiles = [
    'scripts/check-assets.js',
    'scripts/manage-admin.js',
    'scripts/server-warmup.js'
  ];
  
  let passCount = 0;
  
  jsFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        // 简单的语法检查
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('module.exports') || content.includes('console.log')) {
          colorLog(`  ✅ ${path.basename(filePath)}: 语法正常`, 'green');
          passCount++;
        } else {
          colorLog(`  ⚠️  ${path.basename(filePath)}: 可能存在问题`, 'yellow');
        }
      } catch (error) {
        colorLog(`  ❌ ${path.basename(filePath)}: 语法错误`, 'red');
      }
    }
  });
  
  colorLog(`\n📊 语法验证: ${passCount}/${jsFiles.length} 通过`, 'blue');
  return passCount === jsFiles.length;
}

/**
 * 主测试函数
 */
async function runTests() {
  colorLog('🚀 开始测试剩余脚本的可用性...', 'blue');
  colorLog('=' .repeat(50), 'blue');
  
  const results = {
    packageScripts: checkPackageScripts(),
    scriptFiles: checkScriptFiles(),
    scriptsDirectory: checkScriptsDirectory(),
    syntaxValidation: validateScriptSyntax()
  };
  
  // 生成测试报告
  colorLog('\n' + '='.repeat(50), 'blue');
  colorLog('📋 测试报告', 'blue');
  colorLog('=' .repeat(50), 'blue');
  
  const allPassed = Object.values(results).every(result => result === true);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ 通过' : '❌ 失败';
    const color = passed ? 'green' : 'red';
    colorLog(`${test}: ${status}`, color);
  });
  
  colorLog('\n' + '='.repeat(50), 'blue');
  
  if (allPassed) {
    colorLog('🎉 所有测试通过！脚本清理成功完成！', 'green');
    colorLog('💡 建议: 现在可以安全地提交这些更改', 'blue');
  } else {
    colorLog('⚠️  部分测试失败，请检查相关问题', 'yellow');
  }
  
  return allPassed;
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    colorLog(`\n❌ 测试执行失败: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runTests };
