# Vercel 部署指南

## 预缓存系统在 Vercel 中的配置

### 问题背景

在 Vercel 的 serverless 环境中，`instrumentation.ts` 可能无法正常执行，导致预缓存系统未启动。这会导致：

1. 用户数据未预缓存到 Redis
2. 每次请求都需要从数据库查询，导致响应缓慢
3. 出现"数据库查询超时"错误

### 解决方案

我们实现了多层备用方案：

#### 1. 环境变量配置

确保在 Vercel 项目设置中配置以下环境变量：

```
PRECACHE_ACTIVE_USERS=true
```

#### 2. 自动初始化

- `instrumentation.ts` - Next.js 官方初始化入口
- `lib/vercel-init.ts` - Vercel 环境备用初始化
- 关键 API 路由会在首次请求时触发初始化

#### 3. 手动触发（管理员）

如果自动初始化失败，可以通过管理员 API 手动触发：

```bash
# 检查系统状态
curl https://your-app.vercel.app/api/debug/server-status

# 手动触发预缓存（需要管理员权限）
curl -X POST https://your-app.vercel.app/api/admin/trigger-precache \
  -H "Authorization: Bearer your-admin-token"
```

### 部署后验证

#### 1. 使用脚本验证

```bash
# 设置目标 URL
export BASE_URL=https://your-app.vercel.app

# 运行验证脚本
npm run test:vercel-precache

# 或运行完整的部署后初始化
npm run post-deploy
```

#### 2. 手动验证

1. **检查服务器状态**：
   ```
   GET https://your-app.vercel.app/api/debug/server-status
   ```

2. **查看响应中的关键字段**：
   ```json
   {
     "server": {
       "isReady": true,
       "isWarmedUp": true
     },
     "precache": {
       "enabled": true
     },
     "services": {
       "redis": "connected",
       "database": "connected"
     }
   }
   ```

3. **测试 API 性能**：
   - 首次调用可能较慢（触发初始化）
   - 后续调用应该很快（使用缓存）

### 故障排除

#### 1. 预缓存未启用

**症状**：`precache.enabled: false`

**解决方案**：
- 检查环境变量 `PRECACHE_ACTIVE_USERS=true`
- 重新部署项目

#### 2. 服务器未初始化

**症状**：`server.isReady: false`

**解决方案**：
- 调用任意 API 端点触发初始化
- 使用管理员 API 手动触发

#### 3. 数据库查询超时

**症状**：API 响应缓慢，出现超时错误

**解决方案**：
- 检查数据库连接
- 手动触发预缓存
- 检查 Redis 连接状态

#### 4. Redis 连接失败

**症状**：`services.redis: "error"`

**解决方案**：
- 检查 Redis 环境变量配置
- 验证 Redis 服务可用性

### 监控和日志

#### 1. 查看构建日志

在 Vercel 部署页面查看构建日志，寻找：
- `🚀 [Instrumentation] 开始服务器初始化...`
- `✅ [Instrumentation] 服务器初始化完成`
- `🔄 [预缓存] 开始预缓存活跃用户数据...`

#### 2. 运行时日志

在 Vercel Functions 日志中查看：
- 初始化相关日志
- 预缓存执行日志
- 错误信息

### 最佳实践

1. **部署后立即验证**：
   ```bash
   npm run post-deploy
   ```

2. **定期检查状态**：
   - 设置监控检查 `/api/debug/server-status`
   - 监控 API 响应时间

3. **预热关键路径**：
   - 部署后访问主要功能页面
   - 触发几次 API 调用

4. **备用方案**：
   - 保留管理员手动触发功能
   - 在用户反馈性能问题时快速响应

### 环境变量清单

确保以下环境变量在 Vercel 中正确配置：

```
# 数据库
POSTGRES_URL=postgresql://...

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# 预缓存配置
PRECACHE_ACTIVE_USERS=true

# 其他必要配置
AUTH_SECRET=...
JWT_SECRET=...
OPENROUTER_API_KEY=...
```

### 联系支持

如果预缓存系统仍然无法正常工作：

1. 检查 Vercel 部署日志
2. 运行诊断脚本
3. 查看 Functions 运行时日志
4. 联系技术支持并提供相关日志信息
