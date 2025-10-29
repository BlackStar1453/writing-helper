# Stripe 环境配置指南

## 问题描述

当从开发环境切换到生产环境时，pricing 界面无法选取计划，这是因为 Stripe 的测试环境和生产环境是完全隔离的，产品数据无法继承。

## 问题根因

1. **环境隔离**：Stripe 测试环境（`sk_test_`）和生产环境（`sk_live_`）是完全独立的
2. **产品数据不共享**：在测试环境创建的产品和价格不会出现在生产环境中
3. **单一密钥配置**：应用只使用一个 `STRIPE_SECRET_KEY` 环境变量

## 解决方案

### 方案 1：快速解决（推荐用于紧急部署）

1. **获取生产环境密钥**
   ```bash
   # 登录 Stripe Dashboard -> 切换到 Live 模式 -> API Keys
   # 复制 Secret key (以 sk_live_ 开头)
   ```

2. **在生产环境创建产品**
   ```bash
   # 临时更新生产环境的 .env 文件
   STRIPE_SECRET_KEY=sk_live_YOUR_PRODUCTION_KEY
   
   # 运行产品创建脚本
   npm run stripe:setup-production
   ```

3. **配置生产环境 Webhook**
   ```bash
   # 在 Stripe Dashboard -> Webhooks 中创建新的 webhook
   # Endpoint URL: https://yourdomain.com/api/stripe/webhook
   # 选择事件: customer.subscription.created, customer.subscription.updated, etc.
   ```

### 方案 2：完整的环境管理（推荐用于长期维护）

1. **更新环境变量配置**
   ```bash
   # .env (开发环境)
   NODE_ENV=development
   STRIPE_SECRET_KEY_TEST=sk_test_your_test_key
   STRIPE_SECRET_KEY_LIVE=sk_live_your_live_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   
   # 生产环境
   NODE_ENV=production
   STRIPE_SECRET_KEY_TEST=sk_test_your_test_key
   STRIPE_SECRET_KEY_LIVE=sk_live_your_live_key
   STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
   ```

2. **应用会自动根据 NODE_ENV 选择正确的密钥**
   - 开发环境：使用 `STRIPE_SECRET_KEY_TEST`
   - 生产环境：使用 `STRIPE_SECRET_KEY_LIVE`

## 诊断工具

使用内置的诊断工具检查当前配置：

```bash
npm run stripe:diagnose
```

这个工具会检查：
- 环境变量配置
- 当前使用的密钥类型
- Stripe 连接状态
- 必要产品和价格的存在性

## 常用命令

```bash
# 诊断当前环境
npm run stripe:diagnose

# 列出当前环境的产品
npm run stripe:list

# 创建标准产品和价格
npm run stripe:create-prices

# 设置生产环境（交互式）
npm run stripe:setup-production

# 查找需要停用的旧价格
npm run stripe:find-old
```

## 环境切换检查清单

### 部署到生产环境前：

- [ ] 获取生产环境 Stripe 密钥
- [ ] 在生产环境创建必要的产品和价格
- [ ] 配置生产环境 webhook
- [ ] 更新环境变量
- [ ] 运行诊断工具确认配置
- [ ] 测试支付流程

### 开发环境设置：

- [ ] 配置测试环境密钥
- [ ] 创建测试产品和价格
- [ ] 使用 `stripe listen` 设置本地 webhook
- [ ] 测试支付流程

## 故障排除

### 问题：无法选择计划
**原因**：生产环境缺少产品
**解决**：运行 `npm run stripe:setup-production`

### 问题：支付失败
**原因**：Webhook 配置错误
**解决**：检查 webhook URL 和密钥配置

### 问题：价格显示错误
**原因**：缓存或价格配置问题
**解决**：清除缓存，检查价格配置

## 最佳实践

1. **环境隔离**：始终在测试环境中开发和测试
2. **密钥管理**：使用环境变量管理不同环境的密钥
3. **产品同步**：确保测试和生产环境的产品配置一致
4. **监控**：设置 webhook 监控和日志记录
5. **备份**：定期备份产品和价格配置

## 相关文件

- `lib/payments/stripe.ts` - Stripe 客户端配置
- `scripts/diagnose-stripe-environment.js` - 环境诊断工具
- `scripts/setup-production-stripe.js` - 生产环境设置工具
- `scripts/manage-stripe-prices.js` - 产品和价格管理工具
