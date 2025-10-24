#!/usr/bin/env node

/**
 * 同步GitHub releases到Cloudflare R2
 * 缓存热门版本的下载文件以加速下载
 */

const https = require('https');
const { execSync } = require('child_process');

// 配置
const GITHUB_REPO = 'BlackStar1453/Elick-public';
const BUCKET_NAME = 'elick-assets';
const MAX_VERSIONS_TO_SYNC = 1; // 只同步最新的1个版本
const KEEP_VERSIONS = 1; // 在R2中保留的版本数量
const CDN_PREFIX = 'cdn'; // 添加CDN路径前缀

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
        'User-Agent': 'Elick-Assets-Sync',
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
 * 下载文件
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(outputPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 处理重定向
        file.close();
        require('fs').unlinkSync(outputPath);
        return downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        require('fs').unlinkSync(outputPath);
        return reject(new Error(`下载失败: HTTP ${response.statusCode}`));
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (error) => {
        file.close();
        require('fs').unlinkSync(outputPath);
        reject(error);
      });
    }).on('error', (error) => {
      file.close();
      require('fs').unlinkSync(outputPath);
      reject(error);
    });
  });
}

/**
 * 上传文件到R2
 */
function uploadToR2(localPath, remotePath) {
  try {
    console.log(`📤 上传: ${remotePath}`);
    execSync(
      `cd workers && wrangler r2 object put ${BUCKET_NAME}/${remotePath} --file "../${localPath}" --remote`,
      { stdio: 'ignore' }
    );
    return true;
  } catch (error) {
    console.error(`❌ 上传失败: ${remotePath}`, error.message);
    return false;
  }
}

/**
 * 检查文件是否已存在于R2
 */
function checkR2FileExists(remotePath) {
  try {
    execSync(
      `cd workers && wrangler r2 object get ${BUCKET_NAME}/${remotePath} --file /tmp/r2-check --remote`,
      { stdio: 'ignore' }
    );
    // 清理临时文件
    try { execSync('rm -f /tmp/r2-check'); } catch (e) {}
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 获取R2中现有的版本目录
 */
function getExistingVersionsInR2() {
  try {
    console.log('🔍 检查R2中现有的版本...');

    // 尝试获取一些常见的版本目录来推断存在的版本
    const possibleVersions = [];

    // 检查downloads目录下的版本
    for (let major = 0; major <= 5; major++) {
      for (let minor = 0; minor <= 20; minor++) {
        for (let patch = 0; patch <= 20; patch++) {
          const version = `v${major}.${minor}.${patch}`;
          const testPath = `${CDN_PREFIX}/downloads/${version}/latest.json`;

          if (fileExistsInR2(testPath)) {
            possibleVersions.push(version);
            console.log(`   找到版本: ${version}`);
          }
        }
      }
    }

    return possibleVersions;
  } catch (error) {
    console.log('⚠️  无法检查现有版本，继续执行...');
    return [];
  }
}

/**
 * 删除R2中的旧版本
 */
function deleteOldVersionsFromR2(currentVersions, keepCount = KEEP_VERSIONS) {
  try {
    const existingVersions = getExistingVersionsInR2();

    if (existingVersions.length === 0) {
      console.log('📋 R2中没有找到现有版本');
      return;
    }

    // 按版本号排序（最新的在前）
    const sortedVersions = existingVersions.sort((a, b) => {
      const aVersion = a.replace('v', '').split('.').map(Number);
      const bVersion = b.replace('v', '').split('.').map(Number);

      for (let i = 0; i < 3; i++) {
        if (aVersion[i] !== bVersion[i]) {
          return bVersion[i] - aVersion[i]; // 降序
        }
      }
      return 0;
    });

    console.log(`📋 R2中现有版本: ${sortedVersions.join(', ')}`);
    console.log(`🎯 当前要保留的版本: ${currentVersions.join(', ')}`);

    // 确定要删除的版本
    const versionsToDelete = sortedVersions.filter(version =>
      !currentVersions.includes(version)
    ).slice(keepCount); // 保留指定数量的版本

    if (versionsToDelete.length === 0) {
      console.log('✅ 没有需要删除的旧版本');
      return;
    }

    console.log(`🗑️  准备删除旧版本: ${versionsToDelete.join(', ')}`);

    // 删除旧版本的文件
    for (const version of versionsToDelete) {
      console.log(`\n🗑️  删除版本: ${version}`);

      // 删除该版本的所有文件
      const versionPath = `${CDN_PREFIX}/downloads/${version}`;

      try {
        // 尝试删除一些常见的文件类型
        const commonFiles = [
          'latest.json',
          'elick-source-*.tar.gz',
          'Elick_*_*.dmg',
          'Elick_*_*.exe',
          'Elick_*_*.exe.sig',
          'Elick_*.app.tar.gz',
          'Elick_*.app.tar.gz.sig'
        ];

        let deletedCount = 0;

        // 由于wrangler没有直接的列表和批量删除功能，我们尝试删除常见的文件
        const filesToTry = [
          `elick-source-${version}.tar.gz`,
          `Elick_${version.replace('v', '')}_aarch64.dmg`,
          `Elick_${version.replace('v', '')}_universal_universal.dmg`,
          `Elick_${version.replace('v', '')}_x64-setup.exe`,
          `Elick_${version.replace('v', '')}_x64-setup.exe.sig`,
          `Elick_${version.replace('v', '')}_x64.dmg`,
          `Elick_aarch64.app.tar.gz`,
          `Elick_aarch64.app.tar.gz.sig`,
          `Elick_universal.app.tar.gz`,
          `Elick_universal.app.tar.gz.sig`,
          `Elick_x86_64.app.tar.gz`,
          `Elick_x86_64.app.tar.gz.sig`,
          `latest.json`
        ];

        for (const fileName of filesToTry) {
          const fullPath = `${versionPath}/${fileName}`;
          try {
            execSync(
              `cd workers && wrangler r2 object delete ${BUCKET_NAME}/${fullPath} --remote`,
              { stdio: 'ignore' }
            );
            console.log(`   ✅ 删除: ${fileName}`);
            deletedCount++;
          } catch (e) {
            // 文件不存在，忽略错误
          }
        }

        if (deletedCount > 0) {
          console.log(`   📊 删除了 ${deletedCount} 个文件`);
        } else {
          console.log(`   ⚠️  版本 ${version} 中没有找到文件`);
        }

      } catch (error) {
        console.log(`   ❌ 删除版本 ${version} 时出错: ${error.message}`);
      }
    }

    console.log(`\n✅ 旧版本清理完成`);

  } catch (error) {
    console.log(`⚠️  清理旧版本时出错: ${error.message}`);
  }
}

/**
 * 生成CDN版本的latest.json
 */
function generateCDNLatestJson(originalLatestJson, version, cdnBaseUrl) {
  if (!originalLatestJson) {
    return null;
  }

  // 深拷贝原始数据
  const cdnLatestJson = JSON.parse(JSON.stringify(originalLatestJson));

  // 替换所有平台的URL为CDN URL，并确保使用正确的更新文件
  if (cdnLatestJson.platforms) {
    for (const platform in cdnLatestJson.platforms) {
      if (cdnLatestJson.platforms[platform] && cdnLatestJson.platforms[platform].url) {
        const originalUrl = cdnLatestJson.platforms[platform].url;
        let fileName = originalUrl.split('/').pop();

        // 确保macOS平台使用app.tar.gz文件而不是dmg文件进行更新
        if (platform.startsWith('darwin-') && fileName.includes('.dmg')) {
          // 将dmg文件名转换为对应的app.tar.gz文件名
          if (fileName.includes('_aarch64.dmg')) {
            fileName = 'Elick_aarch64.app.tar.gz';
          } else if (fileName.includes('x64_x86_64.dmg')) {
            fileName = 'Elick_x86_64.app.tar.gz';
          } else if (fileName.includes('universal_universal.dmg')) {
            fileName = 'Elick_universal.app.tar.gz';
          }
        }

        cdnLatestJson.platforms[platform].url = `${cdnBaseUrl}/downloads/${version}/${fileName}`;
      }
    }
  }

  // 添加CDN信息
  cdnLatestJson.cdn_info = {
    base_url: cdnBaseUrl,
    generated_at: new Date().toISOString(),
    source: 'github-releases-sync'
  };

  return cdnLatestJson;
}

/**
 * 同步单个release
 */
async function syncRelease(release) {
  console.log(`\n📦 同步版本: ${release.tag_name}`);

  const tempDir = `temp-downloads/${release.tag_name}`;
  require('fs').mkdirSync(tempDir, { recursive: true });

  let syncedCount = 0;
  let skippedCount = 0;
  let latestJsonProcessed = false;
  let originalLatestJson = null;

  for (const asset of release.assets) {
    const remotePath = `${CDN_PREFIX}/downloads/${release.tag_name}/${asset.name}`;

    // 检查是否已存在
    if (checkR2FileExists(remotePath)) {
      console.log(`  ⏭️  跳过已存在: ${asset.name}`);
      skippedCount++;
      continue;
    }

    try {
      const localPath = `${tempDir}/${asset.name}`;

      console.log(`  📥 下载: ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)}MB)`);
      await downloadFile(asset.browser_download_url, localPath);

      // 如果是latest.json文件，需要特殊处理
      if (asset.name === 'latest.json') {
        try {
          const originalContent = require('fs').readFileSync(localPath, 'utf8');
          originalLatestJson = JSON.parse(originalContent);

          // 生成CDN版本的latest.json
          const cdnBaseUrl = 'https://assets.elick.it.com/cdn';
          const cdnLatestJson = generateCDNLatestJson(originalLatestJson, release.tag_name, cdnBaseUrl);

          if (cdnLatestJson) {
            // 写入修改后的latest.json
            require('fs').writeFileSync(localPath, JSON.stringify(cdnLatestJson, null, 2));
            console.log(`  🔄 已将latest.json中的URL替换为CDN URL`);
            latestJsonProcessed = true;
          }
        } catch (error) {
          console.warn(`  ⚠️  处理latest.json时出错: ${error.message}`);
        }
      }

      if (uploadToR2(localPath, remotePath)) {
        syncedCount++;
        console.log(`  ✅ 同步成功: ${asset.name}`);
      }

      // 清理临时文件
      require('fs').unlinkSync(localPath);

    } catch (error) {
      console.error(`  ❌ 同步失败: ${asset.name}`, error.message);
    }
  }

  // 如果没有latest.json文件，尝试生成一个基本的
  if (!latestJsonProcessed && originalLatestJson === null) {
    console.log(`  📝 未找到latest.json，尝试生成基本版本...`);
    try {
      const basicLatestJson = {
        version: release.tag_name,
        notes: release.body || `Release ${release.tag_name}`,
        pub_date: release.published_at,
        platforms: {},
        cdn_info: {
          base_url: 'https://assets.elick.it.com/cdn',
          generated_at: new Date().toISOString(),
          source: 'github-releases-sync-generated'
        }
      };

      // 基于assets推断平台支持（用于应用内更新，优先选择tar.gz文件）
      for (const asset of release.assets) {
        // 跳过签名文件和源码文件
        if (asset.name.includes('.sig') || asset.name.includes('source')) {
          continue;
        }

        // Windows平台：使用exe文件进行更新
        if (asset.name.includes('x64-setup.exe')) {
          basicLatestJson.platforms['windows-x86_64'] = {
            url: `https://assets.elick.it.com/cdn/downloads/${release.tag_name}/${asset.name}`
          };
        }
        // macOS平台：优先使用app.tar.gz文件进行更新（而不是dmg安装包）
        else if (asset.name.includes('aarch64.app.tar.gz')) {
          basicLatestJson.platforms['darwin-aarch64'] = {
            url: `https://assets.elick.it.com/cdn/downloads/${release.tag_name}/${asset.name}`
          };
        } else if (asset.name.includes('x86_64.app.tar.gz')) {
          basicLatestJson.platforms['darwin-x86_64'] = {
            url: `https://assets.elick.it.com/cdn/downloads/${release.tag_name}/${asset.name}`
          };
        } else if (asset.name.includes('universal.app.tar.gz')) {
          basicLatestJson.platforms['darwin-universal'] = {
            url: `https://assets.elick.it.com/cdn/downloads/${release.tag_name}/${asset.name}`
          };
        }
      }

      // 生成并上传latest.json
      const latestJsonPath = `${tempDir}/latest.json`;
      require('fs').writeFileSync(latestJsonPath, JSON.stringify(basicLatestJson, null, 2));

      const remotePath = `${CDN_PREFIX}/downloads/${release.tag_name}/latest.json`;
      if (uploadToR2(latestJsonPath, remotePath)) {
        syncedCount++;
        console.log(`  ✅ 生成并同步latest.json成功`);
      }

      // 清理临时文件
      require('fs').unlinkSync(latestJsonPath);

    } catch (error) {
      console.warn(`  ⚠️  生成latest.json失败: ${error.message}`);
    }
  }

  // 清理临时目录
  try {
    require('fs').rmdirSync(tempDir);
  } catch (error) {
    // 忽略清理错误
  }

  console.log(`  📊 版本 ${release.tag_name}: ${syncedCount} 个新文件, ${skippedCount} 个跳过`);

  return { syncedCount, skippedCount };
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始同步GitHub releases到Cloudflare R2...\n');
  
  try {
    // 检查Wrangler
    try {
      execSync('wrangler whoami', { stdio: 'ignore' });
    } catch (error) {
      console.error('❌ Wrangler未登录，请运行: wrangler login');
      process.exit(1);
    }
    
    // 获取releases
    console.log('📡 获取GitHub releases...');
    const releases = await getGitHubReleases();
    
    if (!releases || releases.length === 0) {
      console.log('⚠️  没有找到releases');
      return;
    }
    
    console.log(`📋 找到 ${releases.length} 个releases，将同步最新 ${MAX_VERSIONS_TO_SYNC} 个`);
    
    // 同步最新版本
    const releasesToSync = releases.slice(0, MAX_VERSIONS_TO_SYNC);
    let totalSynced = 0;
    let totalSkipped = 0;

    // 获取要保留的版本列表
    const versionsToKeep = releasesToSync.map(release => release.tag_name);

    // 在同步之前清理旧版本
    console.log('\n🧹 清理旧版本...');
    console.log('💡 提示: 运行 `node scripts/cleanup-old-versions.js` 来清理旧版本');
    // deleteOldVersionsFromR2(versionsToKeep, KEEP_VERSIONS); // 注释掉，使用独立脚本

    for (const release of releasesToSync) {
      const result = await syncRelease(release);
      totalSynced += result.syncedCount;
      totalSkipped += result.skippedCount;
    }

    console.log('\n📊 同步完成:');
    console.log(`✅ 新同步: ${totalSynced} 个文件`);
    console.log(`⏭️  跳过: ${totalSkipped} 个文件`);
    
    // 列出已同步的文件
    console.log('\n📋 R2中的下载文件:');
    try {
      const result = execSync(`wrangler r2 object list ${BUCKET_NAME} --prefix downloads/`, { encoding: 'utf8' });
      console.log(result);
    } catch (error) {
      console.warn('⚠️  无法列出R2文件:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 同步过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  getGitHubReleases,
  syncRelease
};
