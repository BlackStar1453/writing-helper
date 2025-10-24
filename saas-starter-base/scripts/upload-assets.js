#!/usr/bin/env node

/**
 * 批量上传静态资源到Cloudflare R2
 * 使用方法：node scripts/upload-assets.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const BUCKET_NAME = 'elick-assets';
const ASSETS_DIR = 'public';
const CDN_PREFIX = 'cdn'; // 添加CDN路径前缀

// 需要上传的文件类型
const UPLOAD_EXTENSIONS = ['.gif', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.md', '.json', '.txt'];

// 需要上传的目录
const UPLOAD_DIRS = ['gifs', 'img', 'images', 'icons', 'downloads', 'templates'];

/**
 * 检查Wrangler是否已安装和登录
 */
function checkWrangler() {
  try {
    execSync('wrangler --version', { stdio: 'ignore' });
    console.log('✅ Wrangler CLI已安装');
  } catch (error) {
    console.error('❌ Wrangler CLI未安装，请运行: npm install -g wrangler');
    process.exit(1);
  }

  try {
    execSync('wrangler whoami', { stdio: 'ignore' });
    console.log('✅ Wrangler已登录');
  } catch (error) {
    console.error('❌ Wrangler未登录，请运行: wrangler login');
    process.exit(1);
  }
}

/**
 * 检查存储桶是否存在
 */
function checkBucket() {
  try {
    const result = execSync(`wrangler r2 bucket list`, { encoding: 'utf8' });
    if (result.includes(BUCKET_NAME)) {
      console.log(`✅ 存储桶 ${BUCKET_NAME} 已存在`);
    } else {
      console.log(`📦 创建存储桶 ${BUCKET_NAME}...`);
      execSync(`wrangler r2 bucket create ${BUCKET_NAME}`);
      console.log(`✅ 存储桶 ${BUCKET_NAME} 创建成功`);
    }
  } catch (error) {
    console.error('❌ 检查/创建存储桶失败:', error.message);
    process.exit(1);
  }
}

/**
 * 获取所有需要上传的文件
 */
function getFilesToUpload() {
  const files = [];
  
  UPLOAD_DIRS.forEach(dir => {
    const dirPath = path.join(ASSETS_DIR, dir);
    
    if (!fs.existsSync(dirPath)) {
      console.log(`⚠️  目录不存在: ${dirPath}`);
      return;
    }
    
    const dirFiles = fs.readdirSync(dirPath);
    
    dirFiles.forEach(file => {
      const filePath = path.join(dirPath, file);
      const ext = path.extname(file).toLowerCase();
      
      if (fs.statSync(filePath).isFile() && UPLOAD_EXTENSIONS.includes(ext)) {
        files.push({
          localPath: filePath,
          remotePath: `${CDN_PREFIX}/${dir}/${file}`, // 添加CDN前缀
          size: fs.statSync(filePath).size
        });
      }
    });
  });
  
  return files;
}

/**
 * 上传单个文件
 */
function uploadFile(file) {
  try {
    console.log(`📤 上传: ${file.remotePath} (${(file.size / 1024).toFixed(1)}KB)`);
    
    execSync(
      `wrangler r2 object put ${BUCKET_NAME}/${file.remotePath} --file "${file.localPath}"`,
      { stdio: 'ignore' }
    );
    
    console.log(`✅ 上传成功: ${file.remotePath}`);
    return true;
  } catch (error) {
    console.error(`❌ 上传失败: ${file.remotePath}`, error.message);
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
  
  files.forEach((file, index) => {
    console.log(`[${index + 1}/${files.length}]`);

    if (uploadFile(file)) {
      successCount++;
    } else {
      failCount++;
    }
  });
  
  console.log(`\n📊 上传完成:`);
  console.log(`✅ 成功: ${successCount} 个文件`);
  console.log(`❌ 失败: ${failCount} 个文件`);
  
  if (failCount > 0) {
    console.log(`\n⚠️  有 ${failCount} 个文件上传失败，请检查错误信息`);
  }
}

/**
 * 列出已上传的文件
 */
function listUploadedFiles() {
  try {
    console.log('\n📋 已上传的文件:');
    const result = execSync(`wrangler r2 object list ${BUCKET_NAME}`, { encoding: 'utf8' });
    console.log(result);
  } catch (error) {
    console.error('❌ 获取文件列表失败:', error.message);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始上传静态资源到Cloudflare R2...\n');
  
  // 检查环境
  checkWrangler();
  checkBucket();
  
  // 获取文件列表
  const files = getFilesToUpload();
  
  if (files.length === 0) {
    console.log('⚠️  没有找到需要上传的文件');
    return;
  }
  
  console.log(`\n📁 找到 ${files.length} 个文件需要上传:`);
  files.forEach(file => {
    console.log(`  - ${file.remotePath} (${(file.size / 1024).toFixed(1)}KB)`);
  });
  
  // 确认上传
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\n❓ 确认上传这些文件吗? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      uploadFiles(files);
      listUploadedFiles();
    } else {
      console.log('❌ 上传已取消');
    }
    rl.close();
  });
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  getFilesToUpload,
  uploadFile,
  uploadFiles
};
