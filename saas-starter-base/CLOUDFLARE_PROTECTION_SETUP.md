# Cloudflare 保护配置指南

## 概述

本文档详细介绍如何为您的 Vercel 部署的应用配置 Cloudflare 保护，以防止恶意注册、DDoS 攻击和机器人滥用。

## 1. 配置 Cloudflare DNS

### 1.1 将域名解析迁移到 Cloudflare

1. 登录 [Cloudflare](https://dash.cloudflare.com/)
2. 点击"添加站点"
3. 输入您的域名（例如：yourdomain.com）
4. 选择免费计划或付费计划
5. 按照指示更新您的域名服务器到 Cloudflare

### 1.2 配置 DNS 记录

在 Cloudflare DNS 页面中：
- 删除现有的 A 记录或 CNAME 记录
- 添加新的 CNAME 记录：
  - 名称：`@`（根域名）或 `www`
  - 内容：`cname.vercel-dns.com`
  - 代理状态：✅ 已代理（橙色云朵）

## 2. 配置 Cloudflare Turnstile

### 2.1 创建 Turnstile 站点

1. 在 Cloudflare 控制台中，导航到"Turnstile"
2. 点击"添加站点"
3. 填写配置：
   - **站点名称**：您的应用名称
   - **域名**：您的域名（例如：yourdomain.com）
   - **小部件模式**：托管（推荐）
   - **主题**：浅色/深色/自动

### 2.2 获取密钥

创建后，您会得到：
- **站点密钥**：用于前端
- **密钥**：用于后端验证

## 3. 配置环境变量

### 3.1 在 Vercel 中配置环境变量

在 Vercel 项目设置中，添加以下环境变量：

```bash
# Cloudflare Turnstile 配置
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key_here
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_secret_key_here
```

### 3.2 本地开发环境

在项目根目录的 `.env.local` 文件中添加：

```bash
# Cloudflare Turnstile 配置
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key_here
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_secret_key_here
```

## 4. 高级 Cloudflare 保护配置

### 4.1 配置 Web 应用防火墙 (WAF)

1. 进入 Cloudflare 控制台的"安全性" → "WAF"
2. 启用以下规则：
   - **托管规则**：Cloudflare 托管规则集
   - **OWASP 核心规则集**：基础 Web 应用保护

### 4.2 配置速率限制

1. 进入"安全性" → "速率限制"
2. 创建新规则：

```javascript
// 注册端点保护
(http.request.uri.path eq "/api/auth/sync-user" or http.request.uri.path contains "/sign-up") and (http.request.method eq "POST")
```

配置：
- **阈值**：每小时 5 次请求
- **持续时间**：1 小时
- **操作**：阻止

### 4.3 配置机器人管理

1. 进入"安全性" → "机器人"
2. 配置机器人斗争模式：
   - **模式**：JavaScript 挑战
   - **敏感度**：中等

### 4.4 配置 DDoS 保护

1. 进入"安全性" → "DDoS"
2. 确保以下功能已启用：
   - ✅ HTTP DDoS 攻击保护
   - ✅ L3/L4 DDoS 攻击保护

## 5. 自定义安全规则

### 5.1 阻止已知恶意 IP

创建自定义规则来阻止已知的恶意 IP 范围：

```javascript
// 阻止特定国家/地区（可选）
(ip.geoip.country in {"CN" "RU" "KP"}) and (http.request.uri.path contains "/sign-up")

// 阻止可疑用户代理
(http.user_agent contains "bot" or http.user_agent contains "crawler" or http.user_agent contains "spider") and (http.request.uri.path contains "/sign-up")
```

### 5.2 只允许特定国家/地区访问注册页面

如果您的应用只针对特定地区：

```javascript
// 只允许特定国家访问注册
(ip.geoip.country ne "US" and ip.geoip.country ne "CA") and (http.request.uri.path contains "/sign-up")
```

## 6. 监控和分析

### 6.1 查看安全事件

1. 进入"安全性" → "事件"
2. 查看被阻止的请求和攻击尝试

### 6.2 分析流量

1. 进入"分析" → "安全"
2. 查看：
   - 威胁活动
   - 速率限制触发
   - 机器人流量

## 7. 测试配置

### 7.1 测试 Turnstile

1. 在本地运行应用
2. 访问注册页面
3. 确认 Turnstile 验证码正常显示
4. 尝试注册，确认验证流程正常

### 7.2 测试安全规则

1. 使用不同的 IP 地址测试
2. 使用自动化工具测试速率限制
3. 查看 Cloudflare 控制台中的拦截记录

## 8. 最佳实践

### 8.1 定期更新

- 每月检查 Cloudflare 安全日志
- 根据攻击模式调整规则
- 更新 WAF 规则集

### 8.2 监控性能

- 监控 Cloudflare 缓存命中率
- 检查页面加载速度
- 确保安全规则不影响正常用户

### 8.3 备份配置

- 定期导出 Cloudflare 配置
- 记录所有自定义规则
- 保持配置文档更新

## 9. 故障排除

### 9.1 常见问题

**Q: Turnstile 验证码不显示**
- 检查环境变量是否正确设置
- 确认域名配置是否匹配
- 检查浏览器控制台是否有错误

**Q: 正常用户被误拦截**
- 调整 WAF 敏感度
- 添加白名单规则
- 检查速率限制设置

**Q: 验证失败**
- 确认密钥配置正确
- 检查服务器端验证逻辑
- 查看 Cloudflare 日志

### 9.2 日志调试

在应用中添加详细的日志记录：

```javascript
// 在 actions.ts 中添加更多日志
console.log('Turnstile 验证请求:', {
  token: turnstileToken?.substring(0, 20) + '...',
  timestamp: new Date().toISOString(),
  userAgent: headers().get('user-agent'),
  ip: headers().get('cf-connecting-ip')
});
```

## 10. 成本考虑

### 10.1 免费层限制

Cloudflare 免费计划包括：
- ✅ 基本 DDoS 保护
- ✅ 基本 WAF 规则
- ✅ 无限制的 Turnstile 验证
- ✅ 基本分析

### 10.2 付费功能

如需更高级的保护，考虑升级到 Pro 或 Business 计划：
- 高级 WAF 规则
- 更详细的分析
- 优先支持
- 高级机器人管理

## 结论

通过配置 Cloudflare 保护，您可以显著提高应用的安全性，防止恶意注册和 DDoS 攻击。这种方法比在应用层实现速率限制更有效，因为它在请求到达您的服务器之前就进行了过滤。

记住定期监控和调整您的安全规则，以确保在保护应用的同时不影响正常用户的体验。 