# R2 CDN 脚本使用文档

## 概述

本项目使用 Cloudflare R2 作为 CDN 存储，提供静态资源和下载文件的加速访问。所有脚本位于 `scripts/` 目录下。

## 脚本列表

### 1. `upload-all-assets.js` - 静态资源上传

**功能**: 上传项目中的静态资源到 R2 CDN

**用法**:
```bash
node scripts/upload-all-assets.js
```

**上传的文件**:
- `public/gifs/` → `cdn/gifs/`
- `public/img/` → `cdn/images/`
- `public/downloads/` → `cdn/downloads/`
- `public/templates/` → `cdn/templates/`
- `public/llms.txt` → `cdn/llms.txt`

**特性**:
- 自动检测文件大小和类型
- 交互式确认上传
- 上传后自动测试 CDN 访问
- 显示上传进度和结果

### 2. `sync-github-releases.js` - GitHub Releases 同步

**功能**: 从 GitHub 下载 releases 并上传到 R2 CDN

**用法**:
```bash
node scripts/sync-github-releases.js
```

**配置**:
- 仓库: `BlackStar1453/Elick-public`
- 同步版本数: 1 个最新版本
- 目标路径: `cdn/downloads/{version}/`

**同步的文件类型**:
- 源码包 (`.tar.gz`)
- macOS 安装包 (`.dmg`)
- Windows 安装包 (`.exe`)
- 签名文件 (`.sig`)
- 版本信息 (`latest.json`)

### 3. `cleanup-old-versions.js` - 旧版本清理

**功能**: 清理 R2 中的旧版本文件，只保留最新版本

**用法**:
```bash
node scripts/cleanup-old-versions.js
```

**配置**:
- 保留版本数: 1 个
- 自动发现现有版本
- 按版本号排序删除旧版本

**清理策略**:
- 保留最新的指定数量版本
- 删除所有旧版本的文件
- 显示详细的清理过程

### 4. `sync-and-cleanup.js` - 组合脚本

**功能**: 依次执行同步和清理操作

**用法**:
```bash
node scripts/sync-and-cleanup.js
```

**执行流程**:
1. 同步 GitHub releases
2. 清理旧版本
3. 显示最终状态

### 5. `test-r2-upload.js` - 测试脚本

**功能**: 测试 R2 上传功能和配置

**用法**:
```bash
node scripts/test-r2-upload.js
```

**测试内容**:
- Wrangler 认证状态
- R2 存储桶访问
- 文件上传和下载
- 配置验证

## 配置文件

### `workers/wrangler.toml`

R2 配置的核心文件:

```toml
name = "elick-domain-router"
main = "domain-router.js"
compatibility_date = "2024-01-01"
account_id = "bb92a44c2b36d5f31a539f8cd86676ea"

[[r2_buckets]]
binding = "ELICK_ASSETS"
bucket_name = "elick-assets"
```

**重要**: 所有 wrangler 命令必须从 `workers/` 目录执行以使用正确的配置。

## CDN 访问地址

### 静态资源
- **基础 URL**: `https://assets.elick.it.com/cdn/`
- **GIF 动图**: `https://assets.elick.it.com/cdn/gifs/elick-demo-zh.gif`
- **图片资源**: `https://assets.elick.it.com/cdn/images/bank.png`
- **模板文件**: `https://assets.elick.it.com/cdn/templates/actions-example-zh.json`

### 下载文件
- **下载基础 URL**: `https://assets.elick.it.com/cdn/downloads/`
- **最新版本**: `https://assets.elick.it.com/cdn/downloads/v1.0.0/`
- **版本信息**: `https://assets.elick.it.com/cdn/downloads/v1.0.0/latest.json`

## 使用流程

### 首次设置
1. 确保 Wrangler 已认证: `wrangler login`
2. 验证配置: `node scripts/test-r2-upload.js`
3. 上传静态资源: `node scripts/upload-all-assets.js`
4. 同步 releases: `node scripts/sync-github-releases.js`

### 日常维护
1. 新版本发布后: `node scripts/sync-and-cleanup.js`
2. 更新静态资源: `node scripts/upload-all-assets.js`
3. 手动清理: `node scripts/cleanup-old-versions.js`

### 故障排除
1. 测试连接: `node scripts/test-r2-upload.js`
2. 检查认证: `wrangler whoami`
3. 验证存储桶: `cd workers && wrangler r2 bucket list`

## 重要注意事项

### Wrangler 配置
- **必须使用 `--remote` 标志**: 确保操作远程 R2 而不是本地存储
- **工作目录**: 所有 wrangler 命令从 `workers/` 目录执行
- **账户 ID**: 必须在 `wrangler.toml` 中正确配置

### 版本管理
- 默认只保留 1 个最新版本
- 旧版本会被自动清理
- 可以通过修改脚本配置调整保留策略

### DNS 配置
- **CNAME 记录**: `assets` → `bb92a44c2b36d5f31a539f8cd86676ea.r2.cloudflarestorage.com`
- **代理状态**: 禁用 (灰色云朵)
- **TTL**: 自动

## 监控和维护

### 定期检查
- CDN 访问是否正常
- 存储空间使用情况
- 版本清理是否有效

### 性能优化
- 启用 Cloudflare 缓存
- 配置适当的缓存规则
- 监控访问日志

## 扩展功能

### 自动化部署
可以将这些脚本集成到 CI/CD 流程中:

```yaml
# GitHub Actions 示例
- name: Sync to R2 CDN
  run: |
    npm install -g wrangler
    wrangler login # 使用 API Token
    node scripts/sync-and-cleanup.js
```

### 自定义配置
通过修改脚本顶部的配置常量来调整行为:
- `MAX_VERSIONS_TO_SYNC`: 同步的版本数
- `KEEP_VERSIONS`: 保留的版本数
- `BUCKET_NAME`: 存储桶名称
- `CDN_PREFIX`: CDN 路径前缀
