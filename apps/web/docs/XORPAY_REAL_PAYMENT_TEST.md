# Xorpay 0.1 元真实支付测试指南

## 🎯 测试目标

使用 0.1 元的真实支付验证 Xorpay Premium Type 功能的完整流程。

## ⚠️ 重要提醒

**这是真实支付测试，将产生 0.1 元的实际费用！**

## 🧪 测试步骤

### 1. 准备测试环境

```bash
# 运行测试设置脚本
./scripts/setup-xorpay-test-payment.sh
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 进行支付测试

#### 方案 A: 使用专用测试页面（推荐）
1. 访问 `http://localhost:3000/test-premium-type`
2. 选择是否使用自己的 API Key
3. 点击"开始 0.1 元真实支付测试"
4. 完成微信/支付宝扫码支付

#### 方案 B: 使用正常 Pricing 页面
1. 访问 `http://localhost:3000/pricing`
2. 选择 "Test Premium" 产品（仅开发环境显示）
3. 选择 Xorpay 支付方式
4. 切换"使用自己的 API Key"开关
5. 完成支付流程

### 4. 验证测试结果

```bash
# 使用验证脚本检查结果
./scripts/verify-test-payment.sh your-email@example.com
```

## 📊 预期结果

### 测试场景 1: 选择"使用自己的 API Key"
- `premium_type` = `'use_own_key'`
- `plan_name` = `'Test Premium'`
- `subscription_status` = `'active'`

### 测试场景 2: 未选择"使用自己的 API Key"
- `premium_type` = `'use_elick'`
- `plan_name` = `'Test Premium'`
- `subscription_status` = `'active'`

## 🔍 手动验证方法

```sql
-- 查询用户信息
SELECT 
    id, 
    email, 
    premium_type, 
    plan_name, 
    subscription_status,
    stripe_customer_id,
    updated_at
FROM users 
WHERE email = 'your-email@example.com';
```

## 🐛 故障排除

### 问题 1: 测试产品不显示
- 确保在开发环境 (`NODE_ENV=development`)
- 检查 Xorpay 产品配置是否正确

### 问题 2: 支付后 premium_type 未更新
- 检查 Xorpay 回调日志
- 验证订单信息解析逻辑
- 确认数据库连接正常

### 问题 3: 支付失败
- 检查 Xorpay 配置 (AID, SECRET)
- 验证回调地址设置
- 查看服务器错误日志

## 📋 测试检查清单

- [ ] 测试环境已设置
- [ ] 开发服务器已启动
- [ ] 测试产品配置正确
- [ ] 选择 premium_type 选项
- [ ] 完成 0.1 元支付
- [ ] 验证数据库字段更新
- [ ] 测试两种模式 (use_own_key / use_elick)

## 🎉 测试完成

测试完成后，您将验证：
1. ✅ Xorpay 支付流程正常
2. ✅ premium_type 字段正确设置
3. ✅ 订单信息正确解析
4. ✅ 数据库更新逻辑正常

---

**测试费用**: 0.1 元 × 测试次数  
**建议测试次数**: 2 次（每种模式各一次）  
**总费用**: 约 0.2 元
