# 版本管理配置指南

## 概述

版本管理系统已从基于 Cloudflare R2 CDN 的动态获取改为基于环境变量的静态配置。这样可以:

- ✅ **消除网络延迟** - 不再需要请求 CDN 获取版本信息
- ✅ **简化更新流程** - 只需修改环境变量即可更新版本
- ✅ **提高可靠性** - 不依赖外部服务的可用性
- ✅ **更快的响应速度** - 版本信息直接从配置读取

## 环境变量配置

### 必需的环境变量

在 `.env.local` 文件中添加以下配置:

```bash
# 版本管理配置
# 当前应用版本号（格式: v1.0.0）
NEXT_PUBLIC_APP_VERSION=v1.0.0

# 版本发布日期（ISO 8601格式）
NEXT_PUBLIC_VERSION_PUBLISHED_AT=2024-01-01T00:00:00Z

# 各平台版本可用性（true/false）
NEXT_PUBLIC_VERSION_WINDOWS_AVAILABLE=true
NEXT_PUBLIC_VERSION_MAC_INTEL_AVAILABLE=true
NEXT_PUBLIC_VERSION_MAC_SILICON_AVAILABLE=true
```

### 配置说明

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `NEXT_PUBLIC_APP_VERSION` | 当前版本号，必须以 `v` 开头 | `v1.0.0` |
| `NEXT_PUBLIC_VERSION_PUBLISHED_AT` | 版本发布时间，ISO 8601 格式 | `2024-01-01T00:00:00Z` |
| `NEXT_PUBLIC_VERSION_WINDOWS_AVAILABLE` | Windows 版本是否可用 | `true` 或 `false` |
| `NEXT_PUBLIC_VERSION_MAC_INTEL_AVAILABLE` | Mac Intel 版本是否可用 | `true` 或 `false` |
| `NEXT_PUBLIC_VERSION_MAC_SILICON_AVAILABLE` | Mac Apple Silicon 版本是否可用 | `true` 或 `false` |

## 更新版本流程

### 1. 发布新版本时

当你发布新版本时，按以下步骤操作:

1. **更新环境变量**

   编辑 `.env.local` 文件:
   ```bash
   # 更新版本号
   NEXT_PUBLIC_APP_VERSION=v1.1.0
   
   # 更新发布日期
   NEXT_PUBLIC_VERSION_PUBLISHED_AT=2024-02-01T10:00:00Z
   
   # 根据实际发布的平台设置可用性
   NEXT_PUBLIC_VERSION_WINDOWS_AVAILABLE=true
   NEXT_PUBLIC_VERSION_MAC_INTEL_AVAILABLE=true
   NEXT_PUBLIC_VERSION_MAC_SILICON_AVAILABLE=true
   ```

2. **重启开发服务器**（开发环境）
   ```bash
   npm run dev
   ```

3. **重新部署**（生产环境）
   
   在 Vercel 或其他部署平台的环境变量设置中更新这些值，然后重新部署。

### 2. 部分平台发布

如果某个平台的版本还未准备好，可以将其设置为 `false`:

```bash
NEXT_PUBLIC_APP_VERSION=v1.1.0
NEXT_PUBLIC_VERSION_PUBLISHED_AT=2024-02-01T10:00:00Z

# Windows 版本已发布
NEXT_PUBLIC_VERSION_WINDOWS_AVAILABLE=true

# Mac 版本还在准备中
NEXT_PUBLIC_VERSION_MAC_INTEL_AVAILABLE=false
NEXT_PUBLIC_VERSION_MAC_SILICON_AVAILABLE=false
```

## 代码变更说明

### 修改的文件

1. **环境变量配置文件**
   - `.env.example` - 添加了版本配置示例
   - `env.example` - 添加了版本配置示例

2. **配置文件**
   - `lib/config/preset-config.ts` - 从环境变量读取版本信息
   - `lib/services/version-service.ts` - 简化为直接使用环境配置
   - `lib/version-cache.ts` - 简化为从环境变量获取

3. **API 路由**
   - `src/app/api/check-version/route.ts` - 移除 CDN 请求，使用环境配置
   - `src/app/api/version-info/route.ts` - 简化为直接返回环境配置

### 移除的功能

- ❌ 从 Cloudflare R2 CDN 获取 `latest.json`
- ❌ 网络请求检查文件可用性
- ❌ 版本缓存刷新逻辑（不再需要）
- ❌ 复杂的缓存管理

### 保留的功能

- ✅ 版本信息 API 端点
- ✅ 多平台支持
- ✅ 下载 URL 生成
- ✅ CDN 选择逻辑

## API 使用示例

### 获取版本信息

```typescript
// GET /api/version-info
const response = await fetch('/api/version-info');
const data = await response.json();

console.log(data);
// {
//   success: true,
//   data: {
//     version: "v1.0.0",
//     publishedAt: "2024-01-01T00:00:00Z",
//     availability: {
//       windows: true,
//       macIntel: true,
//       macAppleSilicon: true
//     },
//     lastUpdated: "2024-01-15T10:30:00Z",
//     source: "env"
//   }
// }
```

### 检查特定平台版本

```typescript
// GET /api/check-version?version=v1.0.0&platform=windows
const response = await fetch('/api/check-version?version=v1.0.0&platform=windows');
const data = await response.json();

console.log(data);
// {
//   exists: true,
//   url: "https://assets.elick.it.com/cdn/downloads/v1.0.0/Elick_1.0.0_x64-setup.exe",
//   size: null,
//   platform: "windows",
//   version: "v1.0.0",
//   source: "env",
//   urls: {
//     primary: "...",
//     china: "...",
//     github: "...",
//     recommended: "..."
//   }
// }
```

## 部署注意事项

### Vercel 部署

1. 在 Vercel 项目设置中添加环境变量
2. 确保所有环境变量都以 `NEXT_PUBLIC_` 开头（客户端可访问）
3. 每次更新版本后重新部署

### 其他平台

确保在部署平台的环境变量设置中配置所有必需的版本相关变量。

## 故障排查

### 版本信息显示为默认值

**问题**: 版本号显示为 `v1.0.0`

**解决方案**: 
1. 检查 `.env.local` 文件是否存在
2. 确认环境变量名称拼写正确
3. 重启开发服务器

### 平台显示为不可用

**问题**: 某个平台显示为不可用，但实际已发布

**解决方案**:
1. 检查对应的 `NEXT_PUBLIC_VERSION_*_AVAILABLE` 环境变量
2. 确保值为字符串 `"true"`（不是布尔值）
3. 重启服务器或重新部署

## 迁移指南

如果你之前使用的是 CDN 方式，迁移步骤:

1. ✅ 添加环境变量配置
2. ✅ 代码已自动更新（本次修改）
3. ✅ 测试版本信息 API
4. ✅ 部署到生产环境
5. ✅ 验证功能正常

## 优势对比

| 特性 | CDN 方式 | 环境变量方式 |
|------|---------|-------------|
| 响应速度 | 慢（需要网络请求） | 快（直接读取配置） |
| 可靠性 | 依赖 CDN 可用性 | 不依赖外部服务 |
| 更新方式 | 上传 JSON 到 CDN | 修改环境变量 |
| 延迟 | 100-500ms | <1ms |
| 复杂度 | 高 | 低 |
| 维护成本 | 高 | 低 |

## 总结

新的版本管理方式更加简单、快速、可靠。只需在环境变量中配置版本信息，系统会自动使用这些配置，无需任何网络请求。

