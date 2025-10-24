# 缓存配置指南

## 🎯 概述

系统支持通过环境变量灵活配置各种缓存的过期时间，以适应不同的部署环境和性能需求。

## 📊 缓存配置项

### 用户使用量缓存
```bash
# 用户使用量信息缓存时间（秒）
CACHE_TTL_USER_USAGE=3600          # 默认: 3600 (1小时)

# 用户使用量缓冲区缓存时间（秒）
CACHE_TTL_USER_USAGE_BUFFER=3600   # 默认: 3600 (1小时)
```

### 用户会话预热缓存
```bash
# 用户会话预热缓存持续时间（秒）
WARMUP_CACHE_DURATION=3600         # 默认: 3600 (1小时)
```

### 客户端预缓存
```bash
# 客户端预缓存数据过期时间（秒）
CLIENT_PRECACHE_DURATION=3600      # 默认: 3600 (1小时)
```

## 🚀 推荐配置

### 开发环境
```bash
# 开发环境 - 较短缓存时间便于测试
CACHE_TTL_USER_USAGE=300           # 5分钟
CACHE_TTL_USER_USAGE_BUFFER=900    # 15分钟
WARMUP_CACHE_DURATION=1800         # 30分钟
CLIENT_PRECACHE_DURATION=1800      # 30分钟
```

### 生产环境
```bash
# 生产环境 - 较长缓存时间提升性能
CACHE_TTL_USER_USAGE=3600          # 1小时
CACHE_TTL_USER_USAGE_BUFFER=3600   # 1小时
WARMUP_CACHE_DURATION=3600         # 1小时
CLIENT_PRECACHE_DURATION=3600      # 1小时
```

### 高频使用环境
```bash
# 高频使用 - 更长缓存时间减少数据库压力
CACHE_TTL_USER_USAGE=7200          # 2小时
CACHE_TTL_USER_USAGE_BUFFER=7200   # 2小时
WARMUP_CACHE_DURATION=7200         # 2小时
CLIENT_PRECACHE_DURATION=7200      # 2小时
```

## 🔧 配置说明

### CACHE_TTL_USER_USAGE
- **作用**: 控制用户使用量信息在 Redis 中的缓存时间
- **影响**: 影响使用量检查的性能和数据一致性
- **建议**: 
  - 开发环境: 300-900秒 (便于测试)
  - 生产环境: 3600-7200秒 (平衡性能和一致性)

### CACHE_TTL_USER_USAGE_BUFFER
- **作用**: 控制用户使用量缓冲区数据的缓存时间
- **影响**: 影响使用量更新的频率和性能
- **建议**: 与 CACHE_TTL_USER_USAGE 保持一致

### WARMUP_CACHE_DURATION
- **作用**: 控制用户会话预热的有效期
- **影响**: 影响预热频率和系统资源使用
- **建议**: 
  - 活跃用户多: 3600-7200秒
  - 用户活动间隔长: 1800-3600秒

### CLIENT_PRECACHE_DURATION
- **作用**: 控制客户端预缓存数据的有效期
- **影响**: 影响客户端数据新鲜度和服务器负载
- **建议**: 与用户会话时长匹配

## 📈 性能影响

### 缓存时间过短的影响
- ❌ 频繁的数据库查询
- ❌ 增加服务器负载
- ❌ 响应时间变长
- ✅ 数据一致性更好

### 缓存时间过长的影响
- ✅ 减少数据库查询
- ✅ 提升响应性能
- ✅ 降低服务器负载
- ❌ 数据可能不够新鲜

## 🛠️ 部署配置

### Vercel 环境变量
```bash
# 在 Vercel Dashboard 中设置
CACHE_TTL_USER_USAGE=3600
CACHE_TTL_USER_USAGE_BUFFER=3600
WARMUP_CACHE_DURATION=3600
CLIENT_PRECACHE_DURATION=3600
```

### Docker 环境
```dockerfile
ENV CACHE_TTL_USER_USAGE=3600
ENV CACHE_TTL_USER_USAGE_BUFFER=3600
ENV WARMUP_CACHE_DURATION=3600
ENV CLIENT_PRECACHE_DURATION=3600
```

### 本地开发 (.env.local)
```bash
CACHE_TTL_USER_USAGE=300
CACHE_TTL_USER_USAGE_BUFFER=900
WARMUP_CACHE_DURATION=1800
CLIENT_PRECACHE_DURATION=1800
```

## 🔍 监控和调试

### 检查当前配置
```bash
# 查看环境变量
echo $CACHE_TTL_USER_USAGE
echo $WARMUP_CACHE_DURATION
```

### 缓存状态检查
```bash
# 检查 Redis 缓存
redis-cli TTL user_usage:USER_ID
redis-cli TTL user_precache:USER_ID
```

### 性能监控
- 监控数据库查询频率
- 观察响应时间变化
- 检查缓存命中率

## ⚠️ 注意事项

1. **数据一致性**: 缓存时间越长，数据一致性风险越高
2. **内存使用**: 长缓存时间会增加 Redis 内存使用
3. **用户体验**: 过短的缓存时间会影响响应速度
4. **业务需求**: 根据实际业务场景调整配置

## 🎯 最佳实践

1. **渐进调整**: 从较短时间开始，逐步增加
2. **监控观察**: 密切关注性能指标和错误率
3. **环境区分**: 不同环境使用不同配置
4. **定期评估**: 根据使用情况定期调整配置

通过合理配置这些缓存时间，可以在性能和数据一致性之间找到最佳平衡点。
