#!/usr/bin/env node

/**
 * 下载资源管理脚本
 * 管理GitHub releases的下载文件同步到CDN
 */

const { execSync } = require('child_process');
const https = require('https');

// 配置
const GITHUB_REPO = 'BlackStar1453/Elick-public';
const BUCKET_NAME = 'elick-assets';
const CDN_PREFIX = 'cdn';
const CDN_BASE_URL = 'https://elick.it.com/cdn';

/**
 * 获取GitHub releases
 */
function getGitHubReleases() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases`,
      method: 'GET',
      headers: {
        'User-Agent': 'Elick-Downloads-Manager',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const releases = JSON.parse(data);
          resolve(releases);
        } catch (error) {
          reject(new Error(`解析GitHub API响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`GitHub API请求失败: ${error.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('GitHub API请求超时'));
    });

    req.end();
  });
}

/**
 * 检查CDN中的文件是否存在
 */
function checkCDNFile(version, filename) {
  return new Promise((resolve) => {
    const url = `${CDN_BASE_URL}/downloads/${version}/${filename}`;
    
    https.get(url, { method: 'HEAD' }, (res) => {
      resolve({
        exists: res.statusCode === 200,
        size: res.headers['content-length'] || 'unknown',
        url
      });
    }).on('error', () => {
      resolve({ exists: false, url });
    });
  });
}

/**
 * 检查R2中的文件是否存在
 */
function checkR2File(remotePath) {
  try {
    execSync(`wrangler r2 object head ${BUCKET_NAME}/${remotePath}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 列出指定版本的下载文件状态
 */
async function listDownloadStatus(version) {
  console.log(`\n📋 检查版本 ${version} 的下载文件状态:`);
  
  try {
    const releases = await getGitHubReleases();
    const release = releases.find(r => r.tag_name === version);
    
    if (!release) {
      console.log(`❌ 未找到版本 ${version}`);
      return;
    }
    
    console.log(`📦 版本: ${release.tag_name}`);
    console.log(`📅 发布时间: ${new Date(release.published_at).toLocaleString()}`);
    console.log(`📄 资源文件:`);
    
    for (const asset of release.assets) {
      const remotePath = `${CDN_PREFIX}/downloads/${version}/${asset.name}`;
      const r2Exists = checkR2File(remotePath);
      const cdnStatus = await checkCDNFile(version, asset.name);
      
      console.log(`  📁 ${asset.name}`);
      console.log(`     GitHub: ✅ ${(asset.size / 1024 / 1024).toFixed(1)}MB`);
      console.log(`     R2存储: ${r2Exists ? '✅' : '❌'}`);
      console.log(`     CDN访问: ${cdnStatus.exists ? '✅' : '❌'} ${cdnStatus.url}`);
      
      if (cdnStatus.exists && cdnStatus.size !== 'unknown') {
        console.log(`     CDN大小: ${(parseInt(cdnStatus.size) / 1024 / 1024).toFixed(1)}MB`);
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

/**
 * 同步指定版本的下载文件
 */
async function syncVersion(version) {
  console.log(`\n🔄 同步版本 ${version} 的下载文件...`);
  
  try {
    const releases = await getGitHubReleases();
    const release = releases.find(r => r.tag_name === version);
    
    if (!release) {
      console.log(`❌ 未找到版本 ${version}`);
      return;
    }
    
    let syncedCount = 0;
    let skippedCount = 0;
    
    for (const asset of release.assets) {
      const remotePath = `${CDN_PREFIX}/downloads/${version}/${asset.name}`;
      
      // 检查是否已存在
      if (checkR2File(remotePath)) {
        console.log(`  ⏭️  跳过已存在: ${asset.name}`);
        skippedCount++;
        continue;
      }
      
      try {
        console.log(`  📥 下载并上传: ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)}MB)`);
        
        // 使用wrangler直接从URL上传到R2
        execSync(
          `curl -L "${asset.browser_download_url}" | wrangler r2 object put ${BUCKET_NAME}/${remotePath} --pipe`,
          { stdio: 'inherit' }
        );
        
        syncedCount++;
        console.log(`  ✅ 同步成功: ${asset.name}`);
        
      } catch (error) {
        console.error(`  ❌ 同步失败: ${asset.name}`, error.message);
      }
    }
    
    console.log(`\n📊 版本 ${version} 同步完成:`);
    console.log(`✅ 新同步: ${syncedCount} 个文件`);
    console.log(`⏭️  跳过: ${skippedCount} 个文件`);
    
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
  }
}

/**
 * 列出所有版本
 */
async function listVersions() {
  console.log('📋 获取所有版本...');
  
  try {
    const releases = await getGitHubReleases();
    
    console.log(`\n找到 ${releases.length} 个版本:`);
    releases.slice(0, 10).forEach((release, index) => {
      console.log(`${index + 1}. ${release.tag_name} (${new Date(release.published_at).toLocaleDateString()})`);
    });
    
    if (releases.length > 10) {
      console.log(`... 还有 ${releases.length - 10} 个版本`);
    }
    
  } catch (error) {
    console.error('❌ 获取版本失败:', error.message);
  }
}

/**
 * 清理旧版本文件
 */
async function cleanupOldVersions(keepCount = 3) {
  console.log(`\n🧹 清理旧版本文件，保留最新 ${keepCount} 个版本...`);
  
  try {
    const releases = await getGitHubReleases();
    const versionsToKeep = releases.slice(0, keepCount).map(r => r.tag_name);
    
    console.log(`保留版本: ${versionsToKeep.join(', ')}`);
    
    // 列出R2中的下载文件
    const result = execSync(`wrangler r2 object list ${BUCKET_NAME} --prefix ${CDN_PREFIX}/downloads/`, { encoding: 'utf8' });
    const lines = result.split('\n').filter(line => line.trim());
    
    let deletedCount = 0;
    
    for (const line of lines) {
      const match = line.match(/downloads\/([^\/]+)\//);
      if (match) {
        const version = match[1];
        if (!versionsToKeep.includes(version)) {
          const filePath = line.split(/\s+/)[0];
          try {
            execSync(`wrangler r2 object delete ${BUCKET_NAME}/${filePath}`, { stdio: 'ignore' });
            console.log(`🗑️  删除: ${filePath}`);
            deletedCount++;
          } catch (error) {
            console.warn(`⚠️  删除失败: ${filePath}`);
          }
        }
      }
    }
    
    console.log(`\n🧹 清理完成，删除了 ${deletedCount} 个文件`);
    
  } catch (error) {
    console.error('❌ 清理失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];
  const version = process.argv[3];
  
  console.log('🚀 下载资源管理工具\n');
  
  // 检查Wrangler
  try {
    execSync('wrangler whoami', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Wrangler未登录，请运行: wrangler login');
    process.exit(1);
  }
  
  switch (command) {
    case 'list':
      if (version) {
        await listDownloadStatus(version);
      } else {
        await listVersions();
      }
      break;
      
    case 'sync':
      if (!version) {
        console.error('❌ 请指定版本号，例如: npm run downloads:sync v1.0.0');
        process.exit(1);
      }
      await syncVersion(version);
      break;
      
    case 'cleanup':
      const keepCount = version ? parseInt(version) : 3;
      await cleanupOldVersions(keepCount);
      break;
      
    default:
      console.log('用法:');
      console.log('  node scripts/manage-downloads.js list [version]  # 列出版本或检查指定版本状态');
      console.log('  node scripts/manage-downloads.js sync <version>  # 同步指定版本到CDN');
      console.log('  node scripts/manage-downloads.js cleanup [count] # 清理旧版本，保留指定数量');
      console.log('');
      console.log('示例:');
      console.log('  node scripts/manage-downloads.js list           # 列出所有版本');
      console.log('  node scripts/manage-downloads.js list v1.0.0    # 检查v1.0.0状态');
      console.log('  node scripts/manage-downloads.js sync v1.0.0    # 同步v1.0.0到CDN');
      console.log('  node scripts/manage-downloads.js cleanup 5      # 保留最新5个版本');
      break;
  }
}

// 运行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  listDownloadStatus,
  syncVersion,
  listVersions,
  cleanupOldVersions
};
