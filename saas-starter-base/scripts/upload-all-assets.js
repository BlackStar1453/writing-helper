#!/usr/bin/env node

/**
 * 上传所有静态资源到Cloudflare R2
 * 包括GIF、图片、下载文件、模板等
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 上传所有静态资源到Cloudflare R2...\n');

// 配置
const BUCKET_NAME = 'elick-assets';

// 要上传的文件列表
const filesToUpload = [
  // GIF文件
  {
    localPath: 'public/gifs/elick-demo-zh.gif',
    remotePath: 'cdn/gifs/elick-demo-zh.gif',
    contentType: 'image/gif'
  },
  {
    localPath: 'public/gifs/elick-demo-en.gif',
    remotePath: 'cdn/gifs/elick-demo-en.gif',
    contentType: 'image/gif'
  },
  // 图片文件
  {
    localPath: 'public/img/bank.png',
    remotePath: 'cdn/images/bank.png',
    contentType: 'image/png'
  },
  {
    localPath: 'public/img/syzygy.png',
    remotePath: 'cdn/images/syzygy.png',
    contentType: 'image/png'
  },
  // 下载资源
  {
    localPath: 'public/downloads/README.md',
    remotePath: 'cdn/downloads/README.md',
    contentType: 'text/markdown'
  },
  // 模板文件
  {
    localPath: 'public/templates/actions-example-en.json',
    remotePath: 'cdn/templates/actions-example-en.json',
    contentType: 'application/json'
  },
  {
    localPath: 'public/templates/actions-example-zh.json',
    remotePath: 'cdn/templates/actions-example-zh.json',
    contentType: 'application/json'
  },
  {
    localPath: 'public/templates/actions-template.json',
    remotePath: 'cdn/templates/actions-template.json',
    contentType: 'application/json'
  },
  // 其他文件
  {
    localPath: 'public/llms.txt',
    remotePath: 'cdn/llms.txt',
    contentType: 'text/plain'
  }
];

/**
 * 检查文件是否存在
 */
function checkFiles() {
  console.log('🔍 检查本地文件...');
  
  const existingFiles = [];
  const missingFiles = [];
  
  filesToUpload.forEach(file => {
    if (fs.existsSync(file.localPath)) {
      const stats = fs.statSync(file.localPath);
      existingFiles.push({
        ...file,
        size: stats.size
      });
      console.log(`✅ ${file.localPath} (${(stats.size / 1024).toFixed(1)}KB)`);
    } else {
      missingFiles.push(file);
      console.log(`❌ ${file.localPath} (文件不存在)`);
    }
  });
  
  if (missingFiles.length > 0) {
    console.log(`\n⚠️  ${missingFiles.length} 个文件不存在，将跳过上传`);
  }
  
  return existingFiles;
}

/**
 * 上传单个文件
 */
function uploadFile(file) {
  try {
    console.log(`📤 上传: ${file.remotePath}`);
    
    // 使用wrangler上传文件到远程R2 (从workers目录执行以使用正确的配置)
    const cmd = `cd workers && wrangler r2 object put ${BUCKET_NAME}/${file.remotePath} --file "../${file.localPath}" --remote`;
    execSync(cmd, { stdio: 'pipe' });
    
    console.log(`✅ 上传成功: ${file.remotePath}`);
    return true;
  } catch (error) {
    console.error(`❌ 上传失败: ${file.remotePath}`);
    console.error(`   错误: ${error.message}`);
    return false;
  }
}

/**
 * 批量上传文件
 */
function uploadFiles(files) {
  console.log(`\n📦 开始上传 ${files.length} 个文件...\n`);
  
  let successCount = 0;
  let failCount = 0;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  
  console.log(`📊 总大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB\n`);
  
  files.forEach((file, index) => {
    console.log(`[${index + 1}/${files.length}]`);
    
    if (uploadFile(file)) {
      successCount++;
    } else {
      failCount++;
    }
    console.log(''); // 空行分隔
  });
  
  console.log(`📊 上传完成:`);
  console.log(`✅ 成功: ${successCount} 个文件`);
  console.log(`❌ 失败: ${failCount} 个文件`);
  
  if (successCount > 0) {
    console.log(`\n🎉 上传成功！现在可以通过CDN访问这些文件:`);
    console.log(`   https://assets.elick.it.com/cdn/gifs/elick-demo-zh.gif`);
    console.log(`   https://assets.elick.it.com/cdn/images/bank.png`);
  }
  
  return { successCount, failCount };
}

/**
 * 测试CDN访问
 */
function testCDNAccess() {
  console.log('\n🧪 测试CDN访问...');
  
  const testUrls = [
    'https://assets.elick.it.com/cdn/gifs/elick-demo-zh.gif',
    'https://assets.elick.it.com/cdn/images/bank.png'
  ];
  
  testUrls.forEach(url => {
    try {
      console.log(`测试: ${url}`);
      const result = execSync(`curl -I "${url}"`, { encoding: 'utf8' });
      const statusLine = result.split('\n')[0];
      
      if (statusLine.includes('200')) {
        console.log(`✅ 访问成功: ${statusLine.trim()}`);
      } else {
        console.log(`⚠️  访问问题: ${statusLine.trim()}`);
      }
    } catch (error) {
      console.log(`❌ 测试失败: ${error.message}`);
    }
  });
}

/**
 * 列出R2存储桶中的文件
 */
function listR2Files() {
  try {
    console.log('\n📋 R2存储桶中的文件:');
    
    // 注意：wrangler r2 object list 命令可能不存在，使用替代方法
    console.log('使用Cloudflare Dashboard查看: https://dash.cloudflare.com');
    console.log('路径: R2 Object Storage → elick-assets → Browse');
    
  } catch (error) {
    console.log('⚠️  无法列出文件，请在Cloudflare Dashboard中查看');
  }
}

/**
 * 主函数
 */
function main() {
  try {
    // 检查Wrangler
    execSync('wrangler --version', { stdio: 'ignore' });
    console.log('✅ Wrangler CLI可用\n');
  } catch (error) {
    console.error('❌ Wrangler CLI未安装，请运行: npm install -g wrangler');
    process.exit(1);
  }
  
  // 检查文件
  const existingFiles = checkFiles();
  
  if (existingFiles.length === 0) {
    console.log('❌ 没有找到可上传的文件');
    return;
  }
  
  console.log(`\n📁 准备上传 ${existingFiles.length} 个文件`);
  
  // 确认上传
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\n❓ 确认上传这些文件吗? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const result = uploadFiles(existingFiles);
      
      if (result.successCount > 0) {
        // 等待一下让上传生效
        console.log('\n⏳ 等待CDN生效 (30秒)...');
        setTimeout(() => {
          testCDNAccess();
          listR2Files();
          
          console.log('\n🎉 上传流程完成！');
          console.log('💡 提示: 如果CDN访问仍有问题，请等待5-15分钟让配置完全生效');
          rl.close();
        }, 30000);
      } else {
        console.log('\n❌ 上传失败，请检查错误信息');
        rl.close();
      }
    } else {
      console.log('❌ 上传已取消');
      rl.close();
    }
  });
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { uploadFiles, checkFiles };
