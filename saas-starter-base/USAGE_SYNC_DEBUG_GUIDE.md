# 使用量同步调试指南

## 问题描述
用户在每次触发 `hasNotEngine-ultra-fast` 后，使用量应该自动同步更新到数据库，但发现同步没有正确进行。

## 已发现并修复的问题

### 1. 配置问题
- **问题**: 配置值与注释不匹配，导致同步条件过于严格
- **修复**: 
  - `FORCE_SYNC_THRESHOLD`: 10 → 5 (更容易触发同步)
  - `SYNC_INTERVAL`: 10分钟 → 2分钟 (更频繁检查)
  - `SYNC_CHECK_INTERVAL`: 5分钟 → 1分钟 (更频繁主检查)

### 2. 日志不足
- **问题**: 缺少详细的流程日志，难以定位问题
- **修复**: 在所有关键函数中添加了详细的日志输出

### 3. 测试工具缺失
- **问题**: 缺少有效的测试和诊断工具
- **修复**: 添加了多个测试API和完整的测试脚本

## 使用量同步流程

### 正常流程
1. 用户调用 `/api/hasNotEngine-ultra-fast`
2. API 异步调用 `checkAndUpdateUsageUltraFast(userId, type)`
3. 函数更新缓存中的缓冲区使用量 (`premiumBufferUsed` 或 `fastBufferUsed`)
4. `ActiveSyncManager` 定期检查并同步缓冲区数据到数据库

### 同步触发条件
缓冲区数据会在以下情况下同步到数据库：
- 缓冲区使用量达到阈值 (≥5次)
- 距离上次同步超过2分钟且有缓冲区数据
- 距离上次同步超过10分钟且有缓冲区数据
- 用户会话超时(60分钟)且有缓冲区数据

### 同步机制
- **心跳检查**: 每30秒检查一次紧急同步需求
- **主同步检查**: 每1分钟检查一次所有用户
- **保障机制**: 每10分钟强制检查一次所有用户

## 测试和诊断工具

### 1. 检查同步管理器状态
```bash
curl -X POST http://localhost:3000/api/admin/users-usage \
  -H "Content-Type: application/json" \
  -d '{"action": "check_sync_manager"}'
```

### 2. 获取用户使用量统计
```bash
curl -X POST http://localhost:3000/api/admin/users-usage \
  -H "Content-Type: application/json" \
  -d '{"action": "get_user_stats", "userId": "USER_ID"}'
```

### 3. 诊断用户同步状态
```bash
curl -X POST http://localhost:3000/api/admin/users-usage \
  -H "Content-Type: application/json" \
  -d '{"action": "diagnose_user", "userId": "USER_ID"}'
```

### 4. 测试缓存和数据库操作
```bash
curl -X POST http://localhost:3000/api/admin/users-usage \
  -H "Content-Type: application/json" \
  -d '{"action": "test_cache_db", "userId": "USER_ID"}'
```

### 5. 模拟使用量触发
```bash
curl -X POST http://localhost:3000/api/admin/users-usage \
  -H "Content-Type: application/json" \
  -d '{"action": "simulate_usage", "userId": "USER_ID", "type": "fast", "count": 3}'
```

### 6. 强制同步用户
```bash
curl -X POST http://localhost:3000/api/admin/users-usage \
  -H "Content-Type: application/json" \
  -d '{"action": "sync_user", "userId": "USER_ID"}'
```

## 自动化测试脚本

使用提供的测试脚本进行完整的流程测试：

```bash
# 设置环境变量
export BASE_URL="http://localhost:3000"
export TEST_USER_ID="your-user-id"

# 运行测试
node test-usage-sync.js
```

测试脚本会：
1. 检查系统状态
2. 测试缓存和数据库基础操作
3. 模拟使用量触发
4. 等待自动同步或执行强制同步
5. 验证最终结果

## 日志监控

关键日志标识符：
- `[UsageCheck]`: 使用量检查流程
- `[SmartCache]`: 智能缓存同步
- `[DB-Sync]`: 数据库同步操作
- `[ActiveSync]`: 主动同步管理器
- `[Heartbeat]`: 心跳检查
- `[保障机制]`: 保障机制检查

## 故障排除

### 如果同步仍然不工作：

1. **检查ActiveSyncManager是否运行**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/users-usage \
     -H "Content-Type: application/json" \
     -d '{"action": "check_sync_manager"}'
   ```

2. **检查用户是否在活跃列表中**:
   - 查看日志中的活跃用户统计
   - 确认用户ID正确

3. **检查缓冲区数据**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/users-usage \
     -H "Content-Type: application/json" \
     -d '{"action": "get_user_stats", "userId": "USER_ID"}'
   ```

4. **手动触发同步**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/users-usage \
     -H "Content-Type: application/json" \
     -d '{"action": "sync_user", "userId": "USER_ID"}'
   ```

5. **检查数据库连接**:
   - 查看数据库连接池状态
   - 检查数据库更新权限

## 配置调整

如需进一步调整同步行为，可以修改 `lib/usage-ultra-fast.ts` 中的 `SMART_CACHE_CONFIG`:

```typescript
const SMART_CACHE_CONFIG = {
  BUFFER_SIZE: 10,                    // 预留缓冲区大小
  SESSION_TIMEOUT: 60 * 60 * 1000,    // 会话超时时间
  SYNC_INTERVAL: 2 * 60 * 1000,       // 同步检查间隔
  FORCE_SYNC_THRESHOLD: 5,            // 强制同步阈值
  MAX_SYNC_INTERVAL: 10 * 60 * 1000,  // 最大同步间隔
  HEARTBEAT_INTERVAL: 30 * 1000,      // 心跳检查间隔
  SYNC_TIMEOUT: 5000,                 // 同步超时时间
  MAX_CONCURRENT_SYNCS: 3,            // 最大并发同步数
};
```
