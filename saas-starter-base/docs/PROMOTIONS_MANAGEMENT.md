# 促销管理系统

本文档介绍了SaaS系统中的促销管理功能，包括促销码创建、管理和使用。

## 🎯 功能概览

### 用户端功能
- ✅ 在付费计划中输入促销码
- ✅ 实时验证促销码有效性
- ✅ 显示折扣金额和最终价格
- ✅ 免费计划不显示促销码输入

### 管理员功能
- ✅ 创建和管理促销码
- ✅ 支持手动设置和随机生成促销码
- ✅ 支持百分比和固定金额折扣
- ✅ 设置促销码有效期和使用限制
- ✅ 查看促销码使用统计
- ✅ 价格管理和同步

## 📱 界面访问

### 管理员界面
- **促销管理**: `/promotions`
- **价格管理**: `/admin/pricing`
- **促销码管理**: `/admin/promo-codes`

### 用户界面
- **定价页面**: `/pricing` (包含促销码输入)

## 🛠️ 技术实现

### 数据库结构
```sql
-- 促销活动表
CREATE TABLE promotions (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(50) UNIQUE,  -- 新增的促销码字段
  discount_type VARCHAR(20) NOT NULL, -- 'percentage' | 'fixed_amount'
  discount_value INTEGER NOT NULL,
  target_plans TEXT NOT NULL,
  target_payment_methods TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
```

### API接口

#### 管理员API
- `GET /api/admin/promo-codes` - 获取促销码列表
- `POST /api/admin/promo-codes` - 创建/更新促销码
- `GET /api/admin/pricing` - 获取价格数据
- `POST /api/admin/pricing` - 同步价格数据

#### 用户API
- `POST /api/promo-codes/validate` - 验证促销码

### 核心服务
- `lib/promo-codes.ts` - 促销码管理服务
- 支持创建、更新、验证、应用促销码
- 自动生成随机促销码
- 完整的使用统计和限制检查

## 🎨 界面特性

### 促销管理界面 (`/promotions`)
- 📊 **统计卡片**: 显示总促销码数、有效促销码、使用次数等
- 📝 **创建促销码**: 支持手动输入或随机生成
- ✏️ **编辑功能**: 可以修改现有促销码
- 🔍 **搜索筛选**: 按名称、状态等筛选
- 📋 **详细信息**: 显示使用情况、有效期等

### 价格管理界面 (`/admin/pricing`)
- 💰 **价格概览**: Stripe和Xorpay价格对比
- 🔄 **价格同步**: 从Stripe同步最新价格
- 📈 **汇率对比**: 显示USD/CNY汇率对比
- ⚙️ **价格设置**: 配置年付折扣等参数

### 用户端促销码输入
- 🎫 **促销码输入**: 付费计划显示促销码输入框
- ✅ **实时验证**: 输入后立即验证有效性
- 💵 **价格计算**: 显示折扣金额和最终价格
- 🚫 **免费计划**: 不显示促销码选项

## 🧪 测试功能

### 测试脚本
```bash
# 测试促销码功能
npm run test:promo

# 测试促销管理界面
npm run test:promo-ui

# 完整系统测试
npm run test:all

# 调试价格显示
npm run debug:pricing
```

### 测试覆盖
- ✅ 促销码创建和验证
- ✅ 价格计算逻辑
- ✅ UI界面数据结构
- ✅ 搜索和筛选功能
- ✅ 统计数据计算

## 📋 使用指南

### 创建促销码
1. 访问 `/promotions`
2. 点击"创建促销码"
3. 填写促销活动信息：
   - 名称和描述
   - 促销码（可手动输入或自动生成）
   - 折扣类型（百分比/固定金额）
   - 适用计划和支付方式
   - 有效期和使用限制
4. 保存促销码

### 用户使用促销码
1. 访问 `/pricing`
2. 选择付费计划（Premium/Lifetime）
3. 点击"有促销码?"显示输入框
4. 输入促销码并点击"验证"
5. 系统显示折扣金额和最终价格
6. 继续支付流程

### 管理促销码
1. 在促销管理界面查看所有促销码
2. 使用搜索和筛选功能查找特定促销码
3. 点击编辑按钮修改促销码信息
4. 查看使用统计和状态

## 🔧 配置选项

### 促销码类型
- **百分比折扣**: 如20%折扣
- **固定金额**: 如减免¥10

### 适用范围
- **目标计划**: Premium, Lifetime
- **支付方式**: Stripe, Xorpay

### 限制设置
- **有效期**: 开始时间和结束时间
- **使用次数**: 最大使用次数限制
- **优先级**: 多个促销码的优先级

## 🚀 部署注意事项

1. **数据库迁移**: 确保运行了促销码字段的迁移
2. **环境变量**: 配置必要的API密钥
3. **权限控制**: 确保管理员权限正确设置
4. **Toast通知**: 确保安装了sonner包

## 📈 监控和分析

### 关键指标
- 促销码创建数量
- 促销码使用率
- 折扣金额统计
- 转化率影响

### 日志记录
- 促销码验证日志
- 使用记录追踪
- 错误和异常监控

## 🔮 未来扩展

### 计划功能
- 批量导入促销码
- 促销码模板
- A/B测试支持
- 自动化促销活动
- 更详细的分析报告

---

**注意**: 此功能需要管理员权限才能访问管理界面。普通用户只能在定价页面使用促销码。
