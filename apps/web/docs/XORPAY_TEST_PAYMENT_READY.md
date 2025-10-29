# Xorpay 0.1 元真实支付测试 - 准备就绪

## ✅ 已完成的准备工作

### 🔧 代码修复
- ✅ 修复了 Xorpay 订单信息生成和解析逻辑
- ✅ 确保 `premium_type` 字段在所有支付场景下正确设置
- ✅ 添加了 0.1 元测试产品配置

### 📦 创建的测试文件
1. **`scripts/create-xorpay-test-product-simple.js`** - 测试产品配置生成器
2. **`scripts/setup-xorpay-test-payment.sh`** - 完整测试环境设置
3. **`scripts/verify-test-payment.sh`** - 支付结果验证脚本
4. **`src/app/[locale]/(dashboard)/test-premium-type/page.tsx`** - 测试页面
5. **`src/app/api/payments/xorpay/create/route.ts`** - 测试支付 API
6. **`lib/payments/xorpay-test-config.ts`** - 测试产品配置

### 🧪 测试产品配置
- **产品名称**: Test Premium
- **价格**: ¥0.1 (仅开发环境)
- **类型**: subscription
- **用途**: 验证 Premium Type 功能

## 🚀 开始测试

### 步骤 1: 设置测试环境
```bash
# 运行设置脚本（创建所有必要文件）
./scripts/setup-xorpay-test-payment.sh
```

### 步骤 2: 启动开发服务器
```bash
npm run dev
```

### 步骤 3: 访问测试页面
```
http://localhost:3000/test-premium-type
```

### 步骤 4: 进行支付测试

#### 测试场景 1: 使用自己的 API Key
1. 在测试页面中，确保"使用自己的 API Key"开关为**开启**状态
2. 点击"开始 0.1 元真实支付测试"按钮
3. 系统将跳转到 Xorpay 支付页面
4. 使用微信或支付宝扫码支付 0.1 元
5. 支付完成后，等待回调处理

#### 测试场景 2: 使用 Elick 服务
1. 在测试页面中，将"使用自己的 API Key"开关设为**关闭**状态
2. 点击"开始 0.1 元真实支付测试"按钮
3. 完成支付流程

### 步骤 5: 验证测试结果
```bash
# 使用验证脚本检查结果（替换为您的邮箱）
./scripts/verify-test-payment.sh your-email@example.com
```

## 📊 预期结果

### 场景 1 预期结果（使用自己的 API Key）
```
premium_type: 'use_own_key'
plan_name: 'Test Premium'
subscription_status: 'active'
```

### 场景 2 预期结果（使用 Elick 服务）
```
premium_type: 'use_elick'
plan_name: 'Test Premium'
subscription_status: 'active'
```

## 🔍 手动验证方法

如果验证脚本无法使用，可以手动查询数据库：

```sql
-- 查询用户的 premium_type 字段
SELECT 
    id, 
    email, 
    premium_type, 
    plan_name, 
    subscription_status,
    stripe_customer_id,
    updated_at
FROM users 
WHERE email = 'your-email@example.com'
ORDER BY updated_at DESC;
```

## 💰 费用说明

- **单次测试**: 0.1 元
- **建议测试**: 2 次（每种模式各一次）
- **总费用**: 约 0.2 元

## 🐛 故障排除

### 问题 1: 测试页面无法访问
**解决方案**: 确保已运行设置脚本并重启开发服务器

### 问题 2: 支付后 premium_type 未更新
**检查步骤**:
1. 查看服务器控制台日志
2. 检查 Xorpay 回调是否正常接收
3. 验证订单信息解析逻辑

### 问题 3: 支付失败
**检查步骤**:
1. 确认 Xorpay 配置正确 (AID, SECRET)
2. 检查回调地址设置
3. 查看网络连接状态

## 📋 测试检查清单

### 准备阶段
- [ ] 运行设置脚本成功
- [ ] 开发服务器启动正常
- [ ] 测试页面可以访问
- [ ] 用户已登录

### 测试阶段
- [ ] 场景 1: 开启"使用自己的 API Key"
- [ ] 场景 1: 完成 0.1 元支付
- [ ] 场景 1: 验证 premium_type = 'use_own_key'
- [ ] 场景 2: 关闭"使用自己的 API Key"
- [ ] 场景 2: 完成 0.1 元支付
- [ ] 场景 2: 验证 premium_type = 'use_elick'

### 验证阶段
- [ ] 数据库字段正确更新
- [ ] 订单信息正确解析
- [ ] 支付回调正常处理

## 🎯 测试成功标准

1. ✅ 两种模式的支付都能成功完成
2. ✅ `premium_type` 字段根据用户选择正确设置
3. ✅ 订单状态正确更新为 'active'
4. ✅ 支付回调处理无错误

## 📞 技术支持

如果测试过程中遇到问题：
1. 检查服务器控制台日志
2. 查看浏览器开发者工具
3. 运行相关的检测脚本
4. 查阅故障排除文档

---

**准备完成时间**: 2025-09-01  
**测试费用**: 0.1-0.2 元  
**状态**: ✅ 准备就绪，可以开始测试
