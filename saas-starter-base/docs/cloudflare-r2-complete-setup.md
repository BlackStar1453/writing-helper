# Cloudflare R2 + CDN 完整设置指南

本指南将帮你从零开始设置Cloudflare R2存储和CDN，以加速静态资源的全球访问，特别是改善中国大陆用户的访问体验。

## 📋 前置条件

- ✅ Cloudflare账户（免费即可）
- ✅ 域名已托管在Cloudflare DNS
- ✅ 本地已安装Node.js

## 🚀 第一步：安装Wrangler CLI

Wrangler是Cloudflare的官方命令行工具。

```bash
# 全局安装Wrangler
npm install -g wrangler

# 验证安装
wrangler --version
```

## 🔐 第二步：登录Cloudflare

```bash
# 登录Cloudflare账户
wrangler login
```

这会打开浏览器窗口，按提示完成OAuth认证。

## 🪣 第三步：创建R2存储桶

```bash
# 创建存储桶（名称可自定义）
wrangler r2 bucket create elick-assets

# 验证创建成功
wrangler r2 bucket list
```

## 🌐 第四步：配置自定义域名

### 4.1 在Cloudflare Dashboard中设置

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择你的域名
3. 进入 **R2 Object Storage**
4. 点击你的存储桶 `elick-assets`
5. 进入 **Settings** → **Custom Domains**
6. 点击 **Connect Domain**
7. 输入子域名：`assets.yourdomain.com`（替换为你的实际域名）
8. 点击 **Continue** 完成设置

### 4.2 验证域名配置

```bash
# 测试域名解析
nslookup assets.yourdomain.com

# 或使用dig
dig assets.yourdomain.com
```

## 📁 第五步：准备和上传资源

### 5.1 创建资源目录结构

```bash
# 在项目根目录创建临时上传目录
mkdir -p temp-assets/gifs
mkdir -p temp-assets/images
mkdir -p temp-assets/downloads
```

### 5.2 准备GIF文件

将你的GIF文件复制到临时目录：

```bash
# 复制现有的GIF文件
cp public/gifs/*.gif temp-assets/gifs/
cp public/images/*.png temp-assets/images/
cp public/images/*.jpg temp-assets/images/
```

### 5.3 批量上传资源

```bash
# 上传GIF文件
for file in temp-assets/gifs/*; do
  filename=$(basename "$file")
  wrangler r2 object put elick-assets/gifs/$filename --file "$file"
done

# 上传图片文件
for file in temp-assets/images/*; do
  filename=$(basename "$file")
  wrangler r2 object put elick-assets/images/$filename --file "$file"
done

# 验证上传
wrangler r2 object list elick-assets
```

## ⚙️ 第六步：配置项目代码

### 6.1 创建资源配置文件

创建 `lib/config/assets.ts`：

```typescript
// lib/config/assets.ts
export const ASSET_CONFIG = {
  // 使用你的R2自定义域名
  baseUrl: 'https://assets.yourdomain.com',
  
  // 回退到原始资源（如果R2不可用）
  fallbackBaseUrl: '/public',
  
  // GIF资源路径
  gifs: {
    featureDemo: '/gifs/feature-demo.gif',
    downloadDemo: '/gifs/download-demo.gif',
    // 添加更多GIF文件
  },
  
  // 图片资源路径
  images: {
    logo: '/images/logo.png',
    // 添加更多图片文件
  },
  
  // 下载资源路径（可选，用于缓存热门版本）
  downloads: {
    windows: '/downloads/windows/',
    mac: '/downloads/mac/'
  }
}

// 获取资源URL的辅助函数
export function getAssetUrl(path: string, useFallback = false): string {
  const baseUrl = useFallback ? ASSET_CONFIG.fallbackBaseUrl : ASSET_CONFIG.baseUrl
  return `${baseUrl}${path}`
}

// 带错误处理的资源URL获取
export function getAssetUrlWithFallback(path: string): {
  primary: string;
  fallback: string;
} {
  return {
    primary: getAssetUrl(path, false),
    fallback: getAssetUrl(path, true)
  }
}
```

### 6.2 创建智能图片组件

创建 `components/ui/smart-image.tsx`：

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getAssetUrlWithFallback } from '@/lib/config/assets';

interface SmartImageProps {
  assetPath: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function SmartImage({ 
  assetPath, 
  alt, 
  width, 
  height, 
  className, 
  priority = false 
}: SmartImageProps) {
  const [hasError, setHasError] = useState(false);
  const { primary, fallback } = getAssetUrlWithFallback(assetPath);

  return (
    <Image
      src={hasError ? fallback : primary}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={() => setHasError(true)}
    />
  );
}
```

## 🔧 第七步：更新现有组件

### 7.1 更新elick-features.tsx

```typescript
// 在components/elick-features.tsx中
import { SmartImage } from '@/components/ui/smart-image';
import { ASSET_CONFIG } from '@/lib/config/assets';

// 替换现有的img标签
<SmartImage
  assetPath={ASSET_CONFIG.gifs.featureDemo}
  alt="Feature Demo"
  width={800}
  height={600}
  className="rounded-lg shadow-lg"
/>
```

### 7.2 更新下载链接（可选）

如果你想缓存下载文件到R2：

```typescript
// lib/utils/download-urls.ts
import { ASSET_CONFIG, getAssetUrl } from '@/lib/config/assets';

export function getDownloadUrl(version: string, platform: string, filename: string): string {
  // 首先尝试从R2获取
  const r2Url = getAssetUrl(`${ASSET_CONFIG.downloads[platform]}${version}/${filename}`);
  
  // 如果R2没有，回退到GitHub
  const githubUrl = `https://github.com/BlackStar1453/Elick-public/releases/download/${version}/${filename}`;
  
  return r2Url; // 可以添加检查逻辑来决定使用哪个URL
}
```

## 🚀 第八步：测试和验证

### 8.1 本地测试

```bash
# 启动开发服务器
npm run dev

# 检查资源是否正确加载
# 打开浏览器开发者工具，查看Network标签
```

### 8.2 性能测试

```bash
# 使用curl测试资源加载速度
curl -w "@curl-format.txt" -o /dev/null -s "https://assets.yourdomain.com/gifs/feature-demo.gif"

# 创建curl-format.txt文件：
echo "     time_namelookup:  %{time_namelookup}\n        time_connect:  %{time_connect}\n     time_appconnect:  %{time_appconnect}\n    time_pretransfer:  %{time_pretransfer}\n       time_redirect:  %{time_redirect}\n  time_starttransfer:  %{time_starttransfer}\n                     ----------\n          time_total:  %{time_total}\n" > curl-format.txt
```

## 📊 第九步：监控和优化

### 9.1 设置Cloudflare页面规则

在Cloudflare Dashboard中：

1. 进入 **Rules** → **Page Rules**
2. 创建新规则：`assets.yourdomain.com/*`
3. 设置：
   - **缓存级别**: 缓存所有内容
   - **边缘缓存TTL**: 1个月
   - **浏览器缓存TTL**: 1天

### 9.2 启用压缩和优化

在Cloudflare Dashboard中：

1. 进入 **Speed** → **Optimization**
2. 启用：
   - **Auto Minify**: CSS, JavaScript, HTML
   - **Brotli**: 开启
   - **Rocket Loader**: 开启（可选）

## 💰 成本估算

### Cloudflare R2免费额度（每月）：
- **存储**: 10GB
- **读取操作**: 1000万次
- **写入操作**: 100万次
- **删除操作**: 100万次

### 预估使用量：
- GIF文件: ~50MB
- 图片文件: ~100MB
- 月访问量: 10万次
- **总成本**: $0（完全在免费额度内）

## ✅ 完成检查清单

- [ ] 安装Wrangler CLI
- [ ] 登录Cloudflare账户
- [ ] 创建R2存储桶
- [ ] 配置自定义域名
- [ ] 设置环境变量
- [ ] 上传静态资源
- [ ] 创建资源配置文件
- [ ] 更新组件代码
- [ ] 测试资源加载
- [ ] 设置缓存规则
- [ ] 监控性能表现

## 🛠️ 快速命令参考

```bash
# 安装和登录
npm install -g wrangler
wrangler login

# 创建存储桶
wrangler r2 bucket create elick-assets

# 批量上传资源
npm run assets:upload

# 检查资源可用性
npm run assets:check

# 同步GitHub releases（可选）
npm run assets:sync

# 列出R2中的文件
wrangler r2 object list elick-assets

# 删除R2中的文件
wrangler r2 object delete elick-assets/path/to/file.gif
```

## 🆘 常见问题

### Q: 域名解析失败怎么办？
A: 确保域名已托管在Cloudflare DNS，等待DNS传播（最多24小时）。

### Q: 上传文件失败？
A: 检查Wrangler登录状态：`wrangler whoami`

### Q: 资源加载慢？
A: 检查Cloudflare页面规则是否正确配置，确保启用了缓存。

## 📞 获取帮助

如果遇到问题，可以：
1. 查看 [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
2. 检查 [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
3. 在项目中创建issue

---

设置完成后，你的静态资源将通过Cloudflare的全球CDN网络分发，显著改善全球用户（特别是中国大陆用户）的访问体验！
