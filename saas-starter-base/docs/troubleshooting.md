# 故障排除指南

## 常见问题及解决方案

### 1. 上传照片后显示超时错误

**错误信息:**
```
(node:14100) TimeoutNegativeWarning: -363308.641564969 is a negative number.
Timeout duration was set to 1.
```

**原因:**
这个错误通常是由于时间计算问题导致的，特别是在处理 `scheduledVerifyAt` 字段时。

**解决方案:**
我们已经修复了以下几个问题：

1. **数据库查询修复** - 在 `lib/db/queries.ts` 中修复了 `getPendingShareRecords` 函数：
   ```typescript
   // 修复前
   lt(shareRecords.scheduledVerifyAt, now)
   
   // 修复后
   sql`(${shareRecords.scheduledVerifyAt} IS NULL OR ${shareRecords.scheduledVerifyAt} < ${now.toISOString()})`
   ```

2. **前端时间计算修复** - 在 `share-verification.tsx` 中添加了错误处理：
   ```typescript
   const getTimeRemaining = (scheduledVerifyAt: string) => {
     try {
       if (!scheduledVerifyAt) return '即将完成';
       
       const now = new Date();
       const scheduled = new Date(scheduledVerifyAt);
       
       // 检查日期是否有效
       if (isNaN(scheduled.getTime())) return '即将完成';
       
       // ... 其他计算逻辑
     } catch (error) {
       console.error('计算剩余时间失败:', error);
       return '即将完成';
     }
   };
   ```

3. **API 响应格式修复** - 确保时间字段正确序列化：
   ```typescript
   // 在 API 响应中
   submittedAt: record.submittedAt?.toISOString(),
   scheduledVerifyAt: record.scheduledVerifyAt?.toISOString()
   ```

### 2. 图片上传失败

**可能原因:**
- 文件大小超过 5MB
- 文件格式不支持
- 服务器存储权限问题

**解决方案:**
1. 检查文件大小和格式
2. 确保 `public/uploads/share-verification` 目录存在且有写权限
3. 检查服务器日志获取详细错误信息

### 3. 转发记录不显示

**可能原因:**
- 用户未登录
- 数据库连接问题
- API 端点错误

**解决方案:**
1. 确保用户已登录
2. 检查数据库连接
3. 查看浏览器开发者工具的网络请求

### 4. 验证任务不执行

**可能原因:**
- 定时任务未设置
- 数据库中没有待验证记录
- 验证时间未到

**解决方案:**
1. 手动触发验证任务：
   ```bash
   curl -X POST http://localhost:3001/api/cron/share-verification
   ```

2. 检查待验证记录：
   ```bash
   curl http://localhost:3001/api/share-verification/verify
   ```

3. 直接运行验证脚本：
   ```bash
   npx tsx lib/cron/share-verification.ts
   ```

## 调试技巧

### 1. 启用详细日志

在开发环境中，所有重要操作都会在控制台输出日志。查看服务器控制台获取详细信息。

### 2. 使用测试页面

访问 `/test-share` 页面可以测试所有功能：
- 创建转发记录
- 获取转发记录
- 验证记录
- 执行定时任务

### 3. 检查数据库

直接查询数据库检查数据状态：
```sql
-- 查看所有转发记录
SELECT * FROM share_records ORDER BY created_at DESC;

-- 查看待验证记录
SELECT * FROM share_records WHERE status = 'pending';

-- 查看用户使用次数
SELECT id, email, fast_requests_limit, fast_requests_used FROM users;
```

### 4. 浏览器开发者工具

1. 打开开发者工具 (F12)
2. 查看 Network 标签页的请求和响应
3. 查看 Console 标签页的错误信息

## 预防措施

### 1. 定期备份数据库

确保定期备份数据库，特别是在生产环境中。

### 2. 监控日志

设置日志监控和告警，及时发现问题。

### 3. 测试环境验证

在部署到生产环境前，在测试环境中充分验证功能。

### 4. 错误处理

确保所有 API 端点都有适当的错误处理和用户友好的错误信息。

## 联系支持

如果问题仍然存在，请提供以下信息：
1. 错误的完整堆栈跟踪
2. 重现问题的步骤
3. 浏览器和操作系统信息
4. 服务器日志相关部分
