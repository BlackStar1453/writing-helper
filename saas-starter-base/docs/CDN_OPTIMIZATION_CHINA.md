# 中国大陆CDN访问优化指南

## 问题描述

即使使用了Cloudflare R2 CDN (`https://assets.elick.it.com/cdn/downloads/`)，中国大陆用户下载仍然很慢。这是因为Cloudflare在中国大陆的访问优化有限。

## 解决方案

### 1. 配置中国大陆优化CDN

在 `.env.local` 文件中添加：

```env
# 中国大陆优化CDN域名
NEXT_PUBLIC_CHINA_CDN_URL=https://your-china-cdn.com/cdn
```

### 2. 推荐的中国CDN服务商

#### 阿里云CDN
- 在中国大陆有优秀的访问速度
- 支持海外回源到Cloudflare R2
- 配置示例：`https://your-domain.alicdn.com/cdn`

#### 腾讯云CDN
- 腾讯云全球CDN服务
- 支持境外回源
- 配置示例：`https://your-domain.cdn.myqcloud.com/cdn`

#### 七牛云CDN
- 专业的CDN服务
- 支持海外回源
- 配置示例：`https://your-domain.qiniucdn.com/cdn`

### 3. Cloudflare R2配置优化

#### 3.1 自定义域名设置
1. 在Cloudflare R2控制台中设置自定义域名
2. 确保域名已正确解析到R2 bucket
3. 启用Cloudflare CDN加速

#### 3.2 缓存规则优化
在Cloudflare控制台设置：
```
Cache Rule: /downloads/*
Cache Level: Cache Everything
Edge Cache TTL: 1 month
Browser Cache TTL: 1 day
```

#### 3.3 地理位置路由（推荐）
使用Cloudflare Workers进行智能路由：

```javascript
// Cloudflare Worker示例
export default {
  async fetch(request) {
    const country = request.cf.country;
    
    // 中国大陆用户重定向到中国CDN
    if (country === 'CN') {
      const url = new URL(request.url);
      url.hostname = 'your-china-cdn.com';
      return Response.redirect(url.toString(), 302);
    }
    
    // 其他地区使用默认CDN
    return fetch(request);
  }
}
```

### 4. 应用内智能CDN选择

应用已实现智能CDN选择功能：

1. **自动检测**：检测用户是否在中国大陆
2. **速度测试**：并行测试多个CDN的响应速度
3. **智能选择**：自动选择最快的CDN进行下载

### 5. 测试CDN性能

使用以下工具测试CDN性能：

```bash
# 测试主CDN
curl -w "@curl-format.txt" -o /dev/null -s "https://assets.elick.it.com/cdn/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe"

# 测试中国CDN
curl -w "@curl-format.txt" -o /dev/null -s "https://your-china-cdn.com/cdn/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe"
```

curl-format.txt 内容：
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### 6. 监控和分析

在应用中添加CDN性能监控：

```javascript
// 监控下载性能
function trackDownloadPerformance(url, startTime) {
  const loadTime = Date.now() - startTime;
  
  // 发送到分析服务
  analytics.track('download_performance', {
    url,
    loadTime,
    userAgent: navigator.userAgent,
    country: 'detected_country'
  });
}
```

## 实施步骤

1. **选择中国CDN服务商**（阿里云、腾讯云等）
2. **配置回源到Cloudflare R2**
3. **设置环境变量** `NEXT_PUBLIC_CHINA_CDN_URL`
4. **测试下载速度**
5. **监控性能指标**

## 预期效果

- 中国大陆用户下载速度提升 5-10 倍
- 下载成功率显著提高
- 用户体验大幅改善
