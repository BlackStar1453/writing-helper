# 加油包与社交平台配置管理

本文档介绍如何使用管理界面来管理加油包配置和社交平台配置。

## 功能概述

新的管理界面提供以下功能：

1. **加油包配置管理**：管理不同类型的加油包选项
2. **社交平台配置管理**：管理社交媒体平台的转发奖励配置
3. **JSON批量导入**：通过上传JSON文件批量创建配置

## 访问管理界面

管理界面位于：`/admin/booster-config`

只有管理员用户才能访问此页面。

## 加油包配置管理

### 字段说明

- **类型**：`premium`（高级模型）或 `fast`（基础模型）
- **名称**：加油包的显示名称
- **描述**：加油包的详细描述
- **使用次数**：购买后获得的使用次数
- **Stripe价格**：以美分为单位的价格（例如：499 = $4.99）
- **Xorpay价格**：以人民币分为单位的价格（例如：2999 = ¥29.99）
- **推荐**：是否标记为推荐选项
- **启用**：是否在前端显示
- **排序**：显示顺序（数字越小越靠前）

### 操作

- **添加加油包**：点击"添加加油包"按钮创建新配置
- **编辑**：点击编辑按钮修改现有配置
- **删除**：点击删除按钮移除配置
- **启用/禁用**：点击眼睛图标切换启用状态

## 社交平台配置管理

### 字段说明

- **平台ID**：唯一标识符（例如：twitter, xiaohongshu, weibo）
- **显示名称**：平台的显示名称
- **描述**：平台的描述信息
- **奖励数量**：转发成功后获得的使用次数
- **奖励类型**：`fast`（基础模型）或 `premium`（高级模型）
- **分享链接**：用户需要分享的URL
- **启用**：是否在前端显示
- **排序**：显示顺序（数字越小越靠前）

### 操作

- **添加平台**：点击"添加平台"按钮创建新配置
- **编辑**：点击编辑按钮修改现有配置
- **删除**：点击删除按钮移除配置
- **启用/禁用**：点击眼睛图标切换启用状态

## JSON批量导入

### 使用方法

1. 点击"导入JSON"按钮
2. 选择以下方式之一：
   - 点击"选择JSON文件"上传JSON文件
   - 点击"加载示例"查看格式示例
   - 直接在文本框中编辑JSON内容
3. 点击"验证JSON格式"检查格式是否正确
4. 如果验证通过，点击"开始导入"执行批量创建

### JSON格式

#### 加油包配置格式

```json
{
  "boosterOptions": [
    {
      "type": "premium",
      "name": "高级模型加油包",
      "description": "50次高级模型查询",
      "amount": 50,
      "stripePrice": 499,
      "xorpayPrice": 2999,
      "isPopular": true,
      "isActive": true,
      "sortOrder": 1
    }
  ]
}
```

#### 社交平台配置格式

```json
{
  "sharePlatforms": [
    {
      "platformId": "twitter",
      "name": "Twitter",
      "description": "转发并点赞获得使用次数",
      "rewardAmount": 100,
      "rewardType": "fast",
      "shareUrl": "https://twitter.com/intent/tweet?text=...",
      "isActive": true,
      "sortOrder": 1
    }
  ]
}
```

### 示例文件

项目中提供了示例JSON文件：

- `examples/booster-config-example.json`：加油包配置示例
- `examples/share-platforms-example.json`：社交平台配置示例

## 数据库结构

### booster_options 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| type | VARCHAR(20) | 类型：premium/fast |
| name | VARCHAR(255) | 名称 |
| description | TEXT | 描述 |
| amount | INTEGER | 使用次数 |
| stripe_price | INTEGER | Stripe价格（美分） |
| xorpay_price | INTEGER | Xorpay价格（人民币分） |
| is_popular | BOOLEAN | 是否推荐 |
| is_active | BOOLEAN | 是否启用 |
| sort_order | INTEGER | 排序 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### share_platforms 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| platform_id | VARCHAR(50) | 平台ID（唯一） |
| name | VARCHAR(100) | 显示名称 |
| description | TEXT | 描述 |
| reward_amount | INTEGER | 奖励数量 |
| reward_type | VARCHAR(20) | 奖励类型：fast/premium |
| share_url | TEXT | 分享链接 |
| is_active | BOOLEAN | 是否启用 |
| sort_order | INTEGER | 排序 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## API端点

### 加油包配置

- `GET /api/admin/booster-options` - 获取所有配置
- `POST /api/admin/booster-options` - 创建新配置
- `GET /api/admin/booster-options/[id]` - 获取单个配置
- `PATCH /api/admin/booster-options/[id]` - 更新配置
- `DELETE /api/admin/booster-options/[id]` - 删除配置

### 社交平台配置

- `GET /api/admin/share-platforms` - 获取所有配置
- `POST /api/admin/share-platforms` - 创建新配置
- `GET /api/admin/share-platforms/[id]` - 获取单个配置
- `PATCH /api/admin/share-platforms/[id]` - 更新配置
- `DELETE /api/admin/share-platforms/[id]` - 删除配置

### 公共API

- `GET /api/booster-config` - 获取所有启用的配置（供前端使用）

## 注意事项

1. 只有管理员用户才能访问管理界面
2. 删除配置前会有确认提示
3. 禁用的配置不会在前端显示，但数据仍保留在数据库中
4. JSON导入会验证数据格式，确保数据完整性
5. 平台ID必须唯一，重复的平台ID会导致创建失败
