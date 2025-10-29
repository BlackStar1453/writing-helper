# 用户注册配置环境变量

本文档说明了通过环境变量控制用户注册时 API key 限额和时间的配置方法。

## 概述

系统现在支持通过环境变量动态配置用户注册时的各种限额和时间设置，无需修改代码即可调整：

- 用户基础 API 使用限额
- 试用 API Key 的使用次数和过期时间
- 设备管理限制

## 环境变量配置

### 用户注册基础限额

#### `USER_REGISTRATION_PREMIUM_REQUESTS_LIMIT`
- **描述**: 新用户注册时的 Premium 请求限制
- **类型**: 整数
- **默认值**: `0`
- **示例**: `USER_REGISTRATION_PREMIUM_REQUESTS_LIMIT=10`

#### `USER_REGISTRATION_FAST_REQUESTS_LIMIT`
- **描述**: 新用户注册时的 Fast 请求限制
- **类型**: 整数
- **默认值**: `50`
- **示例**: `USER_REGISTRATION_FAST_REQUESTS_LIMIT=100`

#### `USER_REGISTRATION_MAX_DEVICES`
- **描述**: 普通用户最大设备数限制
- **类型**: 整数
- **默认值**: `1`
- **示例**: `USER_REGISTRATION_MAX_DEVICES=2`

#### `USER_REGISTRATION_LIFETIME_MAX_DEVICES`
- **描述**: Lifetime 用户最大设备数限制
- **类型**: 整数
- **默认值**: `3`
- **示例**: `USER_REGISTRATION_LIFETIME_MAX_DEVICES=5`

### 试用 API Key 配置

#### `TRIAL_API_KEY_MAX_USAGE_COUNT`
- **描述**: 试用 API Key 的最大使用次数
- **类型**: 整数
- **默认值**: `50`
- **示例**: `TRIAL_API_KEY_MAX_USAGE_COUNT=100`

#### `TRIAL_API_KEY_CREDIT_LIMIT`
- **描述**: 试用 API Key 的信用额度限制
- **类型**: 浮点数（字符串格式）
- **默认值**: `0.0001`
- **示例**: `TRIAL_API_KEY_CREDIT_LIMIT=0.001`

#### `TRIAL_API_KEY_EXPIRES_DAYS`
- **描述**: 试用 API Key 的过期天数
- **类型**: 整数
- **默认值**: `7`
- **示例**: `TRIAL_API_KEY_EXPIRES_DAYS=14`

## 配置示例

### 开发环境配置 (.env.local)
```bash
# 用户注册基础限额
USER_REGISTRATION_PREMIUM_REQUESTS_LIMIT=5
USER_REGISTRATION_FAST_REQUESTS_LIMIT=100
USER_REGISTRATION_MAX_DEVICES=2
USER_REGISTRATION_LIFETIME_MAX_DEVICES=5

# 试用 API Key 配置
TRIAL_API_KEY_MAX_USAGE_COUNT=100
TRIAL_API_KEY_CREDIT_LIMIT=0.001
TRIAL_API_KEY_EXPIRES_DAYS=14
```

### 生产环境配置
```bash
# 用户注册基础限额（更保守的设置）
USER_REGISTRATION_PREMIUM_REQUESTS_LIMIT=0
USER_REGISTRATION_FAST_REQUESTS_LIMIT=50
USER_REGISTRATION_MAX_DEVICES=1
USER_REGISTRATION_LIFETIME_MAX_DEVICES=3

# 试用 API Key 配置（标准设置）
TRIAL_API_KEY_MAX_USAGE_COUNT=50
TRIAL_API_KEY_CREDIT_LIMIT=0.0001
TRIAL_API_KEY_EXPIRES_DAYS=7
```

### 测试环境配置
```bash
# 用户注册基础限额（更宽松的设置用于测试）
USER_REGISTRATION_PREMIUM_REQUESTS_LIMIT=20
USER_REGISTRATION_FAST_REQUESTS_LIMIT=200
USER_REGISTRATION_MAX_DEVICES=5
USER_REGISTRATION_LIFETIME_MAX_DEVICES=10

# 试用 API Key 配置（更长的测试期）
TRIAL_API_KEY_MAX_USAGE_COUNT=200
TRIAL_API_KEY_CREDIT_LIMIT=0.01
TRIAL_API_KEY_EXPIRES_DAYS=30
```

## 配置验证

系统会自动验证配置的合理性：

### 验证规则
- 所有限额值必须 ≥ 0
- 设备数限制必须 ≥ 1
- 试用 API Key 使用次数必须 ≥ 1
- 信用额度限制必须 > 0
- 过期天数必须 ≥ 1

### 错误处理
- 如果环境变量值无效（非数字），系统会使用默认值并输出警告
- 如果配置验证失败，系统会抛出错误并显示具体的验证失败原因

## 使用方法

### 1. 设置环境变量
在 `.env.local` 文件中添加所需的环境变量：

```bash
USER_REGISTRATION_FAST_REQUESTS_LIMIT=100
TRIAL_API_KEY_EXPIRES_DAYS=14
```

### 2. 重启应用
修改环境变量后需要重启应用以使配置生效。

### 3. 验证配置
在开发环境中，系统会在启动时输出当前的注册配置：

```
📋 [Registration Config] 当前注册配置:
  用户基础限额:
    Premium 请求限制: 0
    Fast 请求限制: 100
    普通用户最大设备数: 1
    Lifetime 用户最大设备数: 3
  试用 API Key 配置:
    最大使用次数: 50
    信用额度限制: 0.0001
    过期天数: 14
```

## 注意事项

### 1. 配置缓存
- 配置在应用启动时读取一次并缓存
- 修改环境变量后需要重启应用
- 测试环境可以使用 `reloadRegistrationConfig()` 重新加载配置

### 2. 向后兼容
- 如果不设置环境变量，系统使用默认值
- 现有用户不受配置更改影响
- 只有新注册的用户会使用新的配置

### 3. 数据库一致性
- 环境变量只影响新用户注册时的初始值设置
- 已存在的用户数据不会被自动更新
- 如需批量更新现有用户，需要单独的数据库迁移脚本

### 4. 监控建议
- 监控新用户注册后的限额设置是否符合预期
- 定期检查试用 API Key 的使用情况和过期时间
- 关注配置验证错误的日志

## 故障排除

### 常见问题

1. **配置不生效**
   - 检查环境变量名称是否正确
   - 确认已重启应用
   - 查看启动日志中的配置输出

2. **配置验证失败**
   - 检查数值是否为有效的数字
   - 确认所有值都满足验证规则
   - 查看错误日志中的具体验证失败原因

3. **新用户限额不正确**
   - 检查注册流程是否使用了新的配置管理模块
   - 确认数据库中的用户记录是否正确
   - 查看用户创建时的日志

### 调试方法

1. **查看当前配置**
   ```javascript
   import { getCachedRegistrationConfig } from '@/lib/config/registration';
   console.log(getCachedRegistrationConfig());
   ```

2. **重新加载配置（仅测试环境）**
   ```javascript
   import { reloadRegistrationConfig } from '@/lib/config/registration';
   const newConfig = reloadRegistrationConfig();
   ```

3. **验证配置**
   ```javascript
   import { validateRegistrationConfig, getRegistrationConfig } from '@/lib/config/registration';
   const config = getRegistrationConfig();
   const validation = validateRegistrationConfig(config);
   console.log(validation);
   ```
