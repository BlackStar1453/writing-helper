# 缓存同步系统使用指南

## 🎯 系统概述

缓存同步系统是一个完整的解决方案，用于确保 Redis 缓存与数据库之间的数据一致性。系统包含自动检查、手动修复和监控功能。

## 🏗️ 系统架构

### 1. **Vercel 定时任务**
- **每日自动检查**: 凌晨2点自动执行缓存一致性检查
- **自动修复**: 发现不一致时自动修复
- **历史记录**: 保存检查结果和修复记录

### 2. **手动同步脚本**
- **灵活检查**: 支持检查特定用户或所有用户
- **预览模式**: 可以预览将要执行的操作
- **批量处理**: 支持自定义批处理大小

### 3. **管理员API**
- **实时监控**: 查看缓存同步状态
- **手动触发**: 管理员可以手动触发检查和修复
- **历史查询**: 查看历史检查记录和统计

## 📅 定时任务配置

### Vercel Cron Jobs (合并版)
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-maintenance",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- **执行时间**: 每天凌晨2点
- **包含任务**:
  1. 缓存同步检查 (自动修复启用)
  2. 版本缓存刷新
  3. 过期数据清理
- **检查范围**: 最近活跃的200个用户
- **批处理**: 每批50个用户

> **注意**: 为了节省 Vercel Cron Job 配额，将多个维护任务合并到一个端点中执行。

## 🔧 手动同步脚本

### 基本用法
```bash
# 检查所有用户但不修复
node scripts/manual-cache-sync.js --check-only --all

# 检查特定用户并自动修复
node scripts/manual-cache-sync.js --user-id=user123 --force-fix

# 预览模式检查前50个活跃用户
node scripts/manual-cache-sync.js --dry-run --batch-size=50

# 交互式检查和修复
node scripts/manual-cache-sync.js
```

### 命令行选项
| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--check-only` | 仅检查，不修复不一致 | false |
| `--user-id=<id>` | 检查特定用户ID | 无 |
| `--batch-size=<size>` | 批处理大小 | 20 |
| `--all` | 检查所有用户 | false (仅活跃用户) |
| `--force-fix` | 强制修复所有不一致，无需确认 | false |
| `--dry-run` | 预览模式，不实际修改 | false |
| `--help, -h` | 显示帮助信息 | - |

## 🌐 管理员API

### 获取缓存同步状态
```bash
# 获取概览信息
GET /api/admin/cache-sync

# 获取当前状态
GET /api/admin/cache-sync?action=status

# 获取历史记录
GET /api/admin/cache-sync?action=history

# 获取缓存统计
GET /api/admin/cache-sync?action=stats
```

### 执行同步操作
```bash
# 执行检查（不修复）
POST /api/admin/cache-sync
{
  "action": "check",
  "options": {
    "checkAll": false,
    "batchSize": 50
  }
}

# 执行修复
POST /api/admin/cache-sync
{
  "action": "fix",
  "options": {
    "checkAll": true,
    "batchSize": 30
  }
}

# 清除历史记录
POST /api/admin/cache-sync
{
  "action": "clear-history"
}
```

## 📊 检查结果说明

### 数据状态类型
- **consistent**: 缓存与数据库数据一致
- **missing_cache**: 数据库有数据但缓存中没有
- **inconsistent**: 缓存与数据库数据不一致
- **cache_only**: 只有缓存数据，数据库中没有记录
- **error**: 检查过程中发生错误

### 统计指标
- **缓存命中率**: 有缓存数据的用户比例
- **数据一致性率**: 数据一致的用户比例
- **自动修复成功率**: 成功修复的不一致比例

## 🛠️ 故障排除

### 常见问题

#### 1. 缓存命中率低 (<90%)
**原因**: 缓存预热机制可能有问题
**解决方案**:
```bash
# 检查服务器预热状态
curl /api/debug/server-status

# 手动触发预缓存
curl -X POST /api/admin/trigger-precache
```

#### 2. 数据一致性率低 (<95%)
**原因**: 缓存更新机制可能有延迟
**解决方案**:
```bash
# 强制修复所有不一致
node scripts/manual-cache-sync.js --all --force-fix

# 增加检查频率（修改 vercel.json）
"schedule": "0 */6 * * *"  # 每6小时检查一次
```

#### 3. 发现孤立缓存
**原因**: 用户数据被删除但缓存未清理
**解决方案**:
```bash
# 手动清理孤立缓存
node scripts/manual-cache-sync.js --check-only --all
# 然后手动删除相关缓存键
```

#### 4. 自动修复失败率高
**原因**: 数据库连接问题或权限问题
**解决方案**:
```bash
# 检查数据库连接
curl /api/health

# 查看详细错误日志
node scripts/manual-cache-sync.js --user-id=failed_user_id
```

## 🔍 监控和告警

### 推荐监控指标
1. **每日检查成功率** > 95%
2. **数据一致性率** > 95%
3. **自动修复成功率** > 90%
4. **检查执行时间** < 5分钟

### 告警设置
```bash
# 可以通过 webhook 或邮件设置告警
# 当一致性率低于阈值时发送通知
```

## 🚀 最佳实践

### 1. 定期检查
- 保持每日自动检查
- 重要更新后手动检查
- 监控检查结果趋势

### 2. 预防措施
- 确保缓存更新逻辑正确
- 使用事务确保数据一致性
- 定期备份重要数据

### 3. 性能优化
- 合理设置批处理大小
- 避免在高峰期执行大规模检查
- 监控数据库和缓存性能

## 📈 扩展功能

### 未来可能的增强
1. **实时监控面板**: Web界面显示缓存状态
2. **智能告警**: 基于历史数据的异常检测
3. **自动恢复**: 更智能的自动修复策略
4. **性能分析**: 缓存性能和命中率分析

## 🔐 安全考虑

### 权限控制
- 管理员API需要认证
- 定时任务使用 CRON_SECRET 保护
- 敏感操作需要确认

### 数据保护
- 不在日志中记录敏感数据
- 历史记录自动过期（7天）
- 支持数据脱敏选项
