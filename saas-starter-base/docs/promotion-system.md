# 限时打折系统实现文档

## 概述

本文档描述了为pricing界面实现的完整限时打折功能，包括数据模型、核心逻辑、用户界面和管理功能。

## 功能特性

### 🎯 核心功能
- ✅ 灵活的促销规则（百分比折扣/固定金额折扣）
- ✅ 多计划支持（Premium、Lifetime）
- ✅ 多支付方式支持（Stripe、Xorpay）
- ✅ 时间范围控制和使用次数限制
- ✅ 智能价格计算和最优促销匹配
- ✅ 实时倒计时显示
- ✅ 促销使用统计和分析

### 🎨 用户界面
- ✅ 促销标识和徽章显示
- ✅ 原价划线和折扣金额展示
- ✅ 实时倒计时组件
- ✅ 响应式设计
- ✅ 中英文国际化支持

### 🔧 管理功能
- ✅ 促销活动创建和编辑
- ✅ 活动状态管理（启用/禁用）
- ✅ 实时统计数据
- ✅ 权限控制（仅管理员可访问）

## 文件结构

```
lib/
├── promotions/
│   └── index.ts                    # 促销核心逻辑
├── db/
│   ├── schema.ts                   # 数据库表结构（已更新）
│   └── migrations/
│       └── add_promotions.sql      # 促销表迁移脚本
src/app/
├── [locale]/(dashboard)/
│   ├── pricing/
│   │   ├── page.tsx                # 定价页面（已更新）
│   │   └── payment-method-selector.tsx  # 支付选择器（已更新）
│   └── admin/promotions/
│       ├── page.tsx                # 管理员促销页面
│       ├── promotion-manager.tsx   # 促销管理组件
│       ├── promotion-form.tsx      # 促销表单组件
│       └── promotion-stats.tsx     # 促销统计组件
└── api/admin/promotions/
    ├── route.ts                    # 促销API路由
    ├── [id]/route.ts              # 单个促销操作
    └── [id]/stats/route.ts        # 促销统计API
messages/
├── zh.json                         # 中文翻译（已更新）
└── en.json                         # 英文翻译（已更新）
```

## 数据库结构

### 促销活动表 (promotions)
```sql
CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  discount_type varchar(20) NOT NULL, -- 'percentage' | 'fixed_amount'
  discount_value integer NOT NULL,
  target_plans text NOT NULL,         -- JSON数组
  target_payment_methods text NOT NULL, -- JSON数组
  start_time timestamp NOT NULL,
  end_time timestamp NOT NULL,
  is_active boolean DEFAULT true,
  max_uses integer,
  current_uses integer DEFAULT 0,
  priority integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  created_by uuid REFERENCES users(id)
);
```

### 促销使用记录表 (promotion_usages)
```sql
CREATE TABLE promotion_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES promotions(id),
  user_id uuid NOT NULL REFERENCES users(id),
  plan_name varchar(50) NOT NULL,
  payment_method varchar(20) NOT NULL,
  original_price integer NOT NULL,
  discount_amount integer NOT NULL,
  final_price integer NOT NULL,
  stripe_session_id text,
  xorpay_order_id text,
  used_at timestamp DEFAULT now()
);
```

## 核心API

### 促销查找和计算
```typescript
// 查找最佳促销
findBestPromotion(planName: string, paymentMethod: string, originalPrice: number)

// 应用促销
applyPromotion(promotionId: string, userId: string, ...)

// 获取活跃促销
getActivePromotions()
```

### 管理API
```
GET    /api/admin/promotions          # 获取所有促销
POST   /api/admin/promotions          # 创建促销
GET    /api/admin/promotions/[id]     # 获取单个促销
PUT    /api/admin/promotions/[id]     # 更新促销
DELETE /api/admin/promotions/[id]     # 删除促销
GET    /api/admin/promotions/[id]/stats # 获取促销统计
```

## 部署步骤

### 1. 数据库迁移
```bash
# 执行促销表创建脚本
psql -d your_database -f lib/db/migrations/add_promotions.sql
```

### 2. 环境变量
确保以下环境变量已配置：
- `POSTGRES_URL` - 数据库连接字符串
- `STRIPE_SECRET_KEY` - Stripe密钥
- `XORPAY_AID` 和 `XORPAY_SECRET` - Xorpay配置

### 3. 权限设置
确保管理员用户的 `role` 字段设置为 `'admin'`：
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## 使用方法

### 创建促销活动
1. 以管理员身份登录
2. 访问 `/admin/promotions`
3. 点击"创建促销活动"
4. 填写促销信息：
   - 活动名称和描述
   - 折扣类型（百分比/固定金额）
   - 目标计划和支付方式
   - 时间范围和使用限制

### 用户体验
1. 用户访问 `/pricing` 页面
2. 系统自动显示可用促销
3. 价格显示包含：
   - 原价（划线）
   - 折扣后价格
   - 折扣标识
   - 倒计时（如果临近结束）
4. 支付时自动应用最优折扣

## 故障排除

### 常见问题

1. **促销不显示**
   - 检查促销活动是否在有效时间内
   - 确认 `is_active` 为 true
   - 验证目标计划和支付方式配置

2. **倒计时不更新**
   - 检查浏览器JavaScript是否启用
   - 确认时区设置正确

3. **管理界面无法访问**
   - 确认用户角色为 'admin'
   - 检查API路由权限验证

4. **更新促销活动时出现日期错误**
   - 问题：`TypeError: value.toISOString is not a function`
   - 原因：日期字段类型处理不当
   - 解决：已修复数据处理函数，支持Date对象和字符串格式

### 调试技巧
```typescript
// 在浏览器控制台检查促销数据
console.log('Active promotions:', await fetch('/api/admin/promotions').then(r => r.json()));

// 检查特定计划的促销计算
console.log('Promotion calculation:', await findBestPromotion('Premium', 'stripe', 800));
```

## 扩展功能

### 可能的增强
- [ ] 优惠券代码支持
- [ ] 用户群体定向（新用户/老用户）
- [ ] A/B测试功能
- [ ] 邮件营销集成
- [ ] 更详细的分析报告

### 性能优化
- [ ] 促销数据缓存
- [ ] 数据库索引优化
- [ ] CDN静态资源缓存

## 安全考虑

- ✅ 管理员权限验证
- ✅ 输入数据验证
- ✅ SQL注入防护
- ✅ 促销使用次数限制
- ✅ 时间范围验证

## 监控和分析

建议监控以下指标：
- 促销活动转化率
- 平均折扣金额
- 用户参与度
- 收入影响分析

---

## 技术支持

如需技术支持或功能扩展，请参考：
- 代码注释和类型定义
- 数据库约束和索引
- API文档和错误处理
