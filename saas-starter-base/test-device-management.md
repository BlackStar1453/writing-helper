# 设备管理系统测试指南

## 概述

本指南帮助您测试设备管理系统的功能，包括设备注册、验证和管理。

## 系统架构

### 设备授权流程

1. **网页登录**：网页用户登录后不需要设备验证，可以直接访问dashboard
2. **客户端应用登录**：桌面应用和浏览器扩展登录时会自动进行设备验证和注册
3. **设备限制**：Lifetime用户最多可以注册3台设备，其他用户1台设备

### 设备注册触发点

- **桌面应用**：调用 `/api/tauri-auth/initiate` 时触发
- **浏览器扩展**：调用 `/api/extension-auth` (GET) 时触发
- **备用验证**：客户端应用调用 `/api/verify-lifetime-access` 时触发

## 测试前准备

### 1. 确认数据库已正确设置

```sql
-- 检查users表是否有maxDevices字段
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'max_devices';

-- 检查devices表是否存在
SELECT table_name FROM information_schema.tables WHERE table_name = 'devices';

-- 检查现有用户的设备限制
SELECT email, plan_name, max_devices FROM users;
```

### 2. 确认用户计划设置

```sql
-- 设置测试用户为Lifetime用户
UPDATE users SET plan_name = 'Lifetime', max_devices = 3 
WHERE email = 'your-test-email@example.com';
```

## 测试场景

### 场景1: 网页登录测试

**目标**：验证网页用户登录不会触发设备验证

**步骤**：
1. 在浏览器中访问 `/sign-in`
2. 使用邮箱和密码登录
3. 确认跳转到dashboard成功
4. 访问 `/dashboard/devices` 查看设备列表
5. 确认设备列表为空（因为网页登录不注册设备）

**期望结果**：
- 登录成功，无设备验证提示
- 设备管理页面显示"还没有授权的设备"
- 页面提示"在新设备上使用服务时，系统会自动注册该设备"

### 场景2: 桌面应用登录测试

**目标**：验证桌面应用登录时的设备注册功能

**步骤**：
1. 在浏览器中登录网页版账户
2. 调用 `/api/tauri-auth/initiate` API：
   ```bash
   curl -X POST http://localhost:3000/api/tauri-auth/initiate \
     -H "Content-Type: application/json" \
     -H "Cookie: session=your-session-cookie"
   ```
3. 检查API响应
4. 访问 `/dashboard/devices` 查看设备列表

**期望结果**：
- **Lifetime用户**：API成功返回认证链接，设备列表显示新注册的设备
- **非Lifetime用户**：API成功返回认证链接，无设备注册（因为不需要设备验证）

### 场景3: 浏览器扩展登录测试

**目标**：验证浏览器扩展登录时的设备注册功能

**步骤**：
1. 发起扩展认证请求：
   ```bash
   curl -X POST http://localhost:3000/api/extension-auth \
     -H "Content-Type: application/json" \
     -d '{"extensionId": "test-extension", "redirectURL": "https://example.com"}'
   ```
2. 记录返回的 `authState`
3. 在网页中使用该 `authState` 进行登录
4. 模拟扩展检查认证状态：
   ```bash
   curl -X GET "http://localhost:3000/api/extension-auth?state=AUTH_STATE&token=JWT_TOKEN" \
     -H "Authorization: Bearer JWT_TOKEN"
   ```
5. 检查设备列表

**期望结果**：
- **Lifetime用户**：扩展认证成功，设备列表显示新注册的设备
- **非Lifetime用户**：扩展认证成功，无设备注册

### 场景4: 设备限制测试

**目标**：验证设备数量限制功能

**步骤**：
1. 确保测试用户为Lifetime用户（max_devices = 3）
2. 使用3个不同的User-Agent或IP地址调用桌面应用登录API
3. 尝试第4次登录
4. 检查响应和设备列表

**期望结果**：
- 前3次登录成功，设备列表显示3台设备
- 第4次登录返回429错误，包含设备限制信息：
  ```json
  {
    "success": false,
    "error": "device_limit_exceeded",
    "message": "已达到设备使用限制（3台）",
    "deviceCount": 3,
    "maxDevices": 3
  }
  ```

### 场景5: 设备管理测试

**目标**：验证设备管理功能

**步骤**：
1. 注册几台设备（通过客户端登录）
2. 访问 `/dashboard/devices`
3. 测试设备名称编辑功能
4. 测试设备删除功能
5. 删除设备后重新尝试客户端登录

**期望结果**：
- 设备列表正确显示所有注册的设备
- 可以成功编辑设备名称
- 可以成功删除设备
- 删除设备后可以注册新设备

### 1. 基本设备注册测试
```bash
# 测试设备注册
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```

### 2. IP地址测试

#### 本地开发环境
- IP地址显示为 `::1` (IPv6本地回环) 或 `127.0.0.1` (IPv4本地回环)
- 这是正常现象，不影响设备验证

#### 模拟真实IP测试
```bash
# 模拟代理头部测试
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-forwarded-for: 192.168.1.100" \
  -H "x-real-ip: 192.168.1.100" \
  -d '{}'
```

#### 生产环境测试
- 部署到生产环境后，IP地址应该显示真实的客户端IP
- 如果使用CDN（如Cloudflare），IP会通过 `cf-connecting-ip` 头部获取

## API测试命令

### 1. 获取设备列表

```bash
curl -X GET http://localhost:3000/api/devices \
  -H "Cookie: session=your-session-cookie"
```

### 2. 更新设备名称

```bash
curl -X PUT http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{"deviceId": "device-id", "name": "新设备名称"}'
```

### 3. 删除设备

```bash
curl -X DELETE "http://localhost:3000/api/devices?deviceId=device-id" \
  -H "Cookie: session=your-session-cookie"
```

### 4. 验证Lifetime访问权限

```bash
curl -X POST http://localhost:3000/api/verify-lifetime-access \
  -H "Authorization: Bearer your-jwt-token" \
  -H "User-Agent: Mozilla/5.0 (Test Device)"
```

## 故障排除

### 1. 设备列表为空

**可能原因**：
- 只进行了网页登录，没有客户端登录
- 数据库迁移未正确应用
- 设备验证逻辑未正确触发

**解决方法**：
- 确认使用客户端登录API
- 检查数据库表结构
- 查看服务器日志

### 2. 设备验证失败

**可能原因**：
- 用户不是Lifetime用户
- 设备指纹生成失败
- 数据库连接问题

**解决方法**：
- 确认用户计划设置
- 检查请求头信息
- 查看数据库日志

### 3. 设备管理页面无法访问

**可能原因**：
- 用户权限不足
- 路由配置问题
- 认证失败

**解决方法**：
- 确认用户为Lifetime用户
- 检查导航设置
- 确认用户已登录

## 测试日志

### 桌面应用登录日志示例

```
[Tauri-Auth] 为lifetime用户进行设备验证...
[Tauri-Auth] 新设备注册成功
[Tauri-Auth] 生成认证链接: elick://auth?user_data=...
```

### 扩展认证日志示例

```
[API] 开始设备注册流程...
[API] 为lifetime用户进行设备验证...
[API] 扩展新设备注册成功
[API] 返回认证状态信息
```

### 设备限制日志示例

```
[Tauri-Auth] 设备验证失败: 已达到设备使用限制（3台）
[Tauri-Auth] 返回429错误
```

## 注意事项

1. **设备指纹生成**：基于User-Agent、IP地址等信息，相同环境会生成相同指纹
2. **设备类型检测**：系统会自动检测设备类型（桌面、移动、平板）
3. **安全考虑**：设备信息不包含敏感数据，IP地址仅用于设备识别
4. **清理策略**：可以定期清理长期未使用的设备记录

## 参考资料

- [设备管理系统设置文档](DEVICE_MANAGEMENT_SETUP.md)
- [数据库架构文档](lib/db/schema.ts)
- [设备管理API文档](src/app/api/devices/route.ts) 