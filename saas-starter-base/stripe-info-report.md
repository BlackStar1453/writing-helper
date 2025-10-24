# Stripe 账户信息报告

## 基本信息
- **环境**: 测试环境 (Test Mode)
- **API 密钥**: `sk_test_51NzPKZHbtP0qSRT050d16BEhfZTV4TqwQeiBd037mL97qvldIKDvxqrGJlXguydTo8VeyDGVpEf1GPeV4otQ0f0j00pIhFC1AH`
- **Live Mode**: `false` (所有数据都是测试数据)

## 账户余额
- **可用余额**: €12.59 EUR
- **待处理余额**: €89.83 EUR
- **总计**: €102.42 EUR

## 产品配置

### 1. Premium 产品
- **产品 ID**: `prod_S4f1kVsIrTYDzm`
- **描述**: Premium subscription plan
- **状态**: 活跃
- **价格配置**:
  - **当前价格**: $4.99/月 (`price_1RnxoAHbtP0qSRT0a2ykKSJ1`) ✅
  - **旧价格**: $8.00/月 (`price_1RAVhAHbtP0qSRT0dsj1EJ9T`) - 包含7天试用期

### 2. Lifetime 产品
- **产品 ID**: `prod_S6rD6veGgnORrK`
- **描述**: 无描述
- **状态**: 活跃
- **价格配置**:
  - **当前价格**: $49.00 一次性 (`price_1RnxoBHbtP0qSRT0jyHXdjVR`) ✅
  - **旧价格**: $29.00 一次性 (`price_1RCdUjHbtP0qSRT0TkW6XcIC`)

### 3. 其他产品
- **Plus**: `prod_S4f1DxN7rXFM0w` - $12.00/月
- **GPT-Tutor**: `prod_OvZN4MufF7x8T3` - $10.00/月
- **Startaer Plan**: `prod_OvYdbc1kgituuj` - $10.00/月
- **测试产品**: 多个 `myproduct` 和 `test` 产品

## 最近支付活动

### 最近5笔交易
1. **$4.99** - Premium 订阅 (2025-01-21)
   - 客户: yaozeng (1519235462@qq.com)
   - 状态: 成功
   - 卡片: Visa ****4242

2. **$49.00** - Lifetime 购买 (2025-01-21)
   - 客户: yaozeng (1519235462@qq.com)
   - 状态: 成功
   - 卡片: Visa ****4242

3. **$4.99** - Premium 订阅 (2025-01-21)
   - 客户: yaozeng (1519235462@qq.com)
   - 状态: 成功
   - 卡片: Visa ****4242

4. **$4.99** - Premium 订阅 (2025-01-21)
   - 客户: yaozeng (1519235462@qq.com)
   - 状态: 成功
   - 卡片: Visa ****4242

5. **$47.90** - 促销价订阅 (2025-01-16)
   - 客户: yaozeng (851064360@qq.com)
   - 状态: 成功
   - 卡片: Visa ****4242

## 活跃订阅

### 当前活跃订阅: 3个
1. **订阅 1**: `sub_1Rv0qvHbtP0qSRT0BbCpqlU5`
   - 产品: Premium ($4.99/月)
   - 客户: cus_SqhWipX4iAFrCp
   - 状态: 活跃
   - 当前周期: 2025-01-21 至 2025-02-20

2. **订阅 2**: `sub_1Rv08CHbtP0qSRT0TviFROon`
   - 产品: Premium ($4.99/月)
   - 客户: cus_SqhWipX4iAFrCp (同一客户)
   - 状态: 活跃
   - 当前周期: 2025-01-21 至 2025-02-20

3. **订阅 3**: `sub_1RuyR3HbtP0qSRT0w5mGAqPI`
   - 产品: Premium ($4.99/月)
   - 客户: cus_SqfmFrZn9Obbru
   - 状态: 活跃
   - 当前周期: 2025-01-21 至 2025-02-20

## 关键发现

### ✅ 正面发现
1. **产品配置正确**: Premium 和 Lifetime 产品都有正确的价格配置
2. **支付正常**: 最近的支付都成功处理
3. **订阅活跃**: 有多个活跃的 Premium 订阅
4. **价格更新**: 已经创建了新的 $4.99 Premium 和 $49 Lifetime 价格

### ⚠️ 需要注意的问题
1. **重复订阅**: 同一客户 (cus_SqhWipX4iAFrCp) 有两个活跃的 Premium 订阅
2. **测试环境**: 所有数据都在测试环境中，生产环境需要重新配置
3. **旧价格**: 仍有旧的价格配置处于活跃状态
4. **产品描述**: Lifetime 产品缺少描述

### 🚨 生产环境迁移需求
1. **创建生产环境产品**: 需要在 Stripe 生产环境中重新创建所有产品和价格
2. **配置生产密钥**: 需要获取并配置生产环境的 API 密钥
3. **设置生产 Webhook**: 需要配置生产环境的 webhook 端点
4. **测试支付流程**: 在生产环境中测试完整的支付流程

## 建议的下一步操作

### 立即操作
1. 运行 `npm run stripe:setup-production` 设置生产环境
2. 获取生产环境 API 密钥并更新环境变量
3. 配置生产环境 webhook

### 清理操作
1. 停用旧的价格配置
2. 清理测试产品 (myproduct, test 等)
3. 检查并合并重复订阅

### 监控操作
1. 设置支付监控和告警
2. 定期检查订阅状态
3. 监控退款和争议

---
*报告生成时间: 2025-01-21*
*数据来源: Stripe CLI 和 API*
