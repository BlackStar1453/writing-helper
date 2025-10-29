# 管理员功能设置指南

## 快速开始

### 1. 设置管理员用户

首先需要将一个用户设置为管理员：

```bash
# 方法1: 使用提供的SQL脚本
psql $DATABASE_URL -f scripts/create-admin-user.sql

# 方法2: 直接执行SQL命令
psql $DATABASE_URL -c "UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';"
```

### 2. 安装依赖

确保安装了必要的依赖：

```bash
npm install @radix-ui/react-select
```

### 3. 访问管理员界面

1. 使用管理员账户登录
2. 在仪表板左侧导航栏找到 "Share Verification Admin"
3. 或直接访问：`/dashboard/admin/share-verification`

## 功能概览

### ✅ 已实现的功能

1. **权限控制系统**
   - 管理员权限检查中间件
   - API权限验证
   - 自动重定向非管理员用户

2. **管理员API端点**
   - 记录列表查询（分页、筛选、搜索）
   - 单个记录详情查看
   - 批量操作（通过、拒绝、删除）
   - 统计信息获取

3. **管理员界面**
   - 统计概览卡片
   - 记录列表和筛选
   - 详情查看对话框
   - 批量操作功能

4. **导航集成**
   - 管理员用户自动显示管理菜单
   - 普通用户不显示管理选项

### 🔧 核心组件

1. **权限中间件** (`lib/auth/admin-middleware.ts`)
   - `checkAdminRole()`: 检查用户是否为管理员
   - `requireAdmin()`: 确保管理员权限，否则重定向
   - `verifyAdminAPI()`: API权限验证

2. **管理员API** (`src/app/api/admin/share-verification/`)
   - `route.ts`: 记录列表和批量操作
   - `[id]/route.ts`: 单个记录操作
   - `stats/route.ts`: 统计信息

3. **管理员页面** (`src/app/[locale]/(dashboard)/dashboard/admin/share-verification/`)
   - `page.tsx`: 页面入口和权限检查
   - `share-verification-admin.tsx`: 主要管理界面组件

## 使用指南

### 管理员日常操作

1. **查看系统状态**
   - 检查统计卡片了解整体情况
   - 关注过期记录提醒

2. **处理转发验证**
   - 查看用户上传的截图
   - 判断是否符合转发要求
   - 通过或拒绝验证请求

3. **批量操作**
   - 选择多条记录
   - 执行批量通过或拒绝
   - 清理无效记录

### 审核标准建议

- ✅ 截图清晰，能看到转发和点赞操作
- ✅ 转发内容与指定平台相符
- ✅ 没有明显的伪造痕迹
- ❌ 截图模糊或不完整
- ❌ 明显的PS痕迹
- ❌ 与要求平台不符

## API 使用示例

### 获取记录列表

```bash
curl -X GET "http://localhost:3001/api/admin/share-verification?page=1&limit=10&status=pending"
```

### 批量通过记录

```bash
curl -X POST "http://localhost:3001/api/admin/share-verification" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve", "recordIds": ["record-id-1", "record-id-2"]}'
```

### 获取统计信息

```bash
curl -X GET "http://localhost:3001/api/admin/share-verification/stats"
```

## 测试和调试

### 运行测试脚本

```bash
# 测试所有管理员API
bash scripts/test-admin-api.sh

# 检查系统健康状态
curl http://localhost:3001/api/share-verification/health
```

### 常见问题排查

1. **403权限不足错误**
   ```sql
   -- 检查用户角色
   SELECT email, role FROM users WHERE email = 'your-email@example.com';
   
   -- 设置管理员权限
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

2. **界面不显示管理菜单**
   - 确认用户角色为 `admin`
   - 重新登录刷新权限
   - 检查浏览器控制台错误

3. **API返回空数据**
   - 检查数据库中是否有转发记录
   - 使用测试页面创建测试数据
   - 查看服务器日志

## 安全注意事项

1. **权限控制**
   - 所有管理员功能都有严格的权限检查
   - 非管理员用户无法访问任何管理功能

2. **数据保护**
   - 管理员操作都有详细日志
   - 敏感操作需要确认

3. **访问控制**
   - 管理员界面只对授权用户可见
   - API端点都有权限验证

## 扩展开发

### 添加新的管理功能

1. 在 `src/app/api/admin/` 下创建新的API端点
2. 使用 `verifyAdminAPI()` 进行权限验证
3. 在管理界面添加相应的UI组件
4. 更新导航菜单

### 自定义权限级别

可以扩展权限系统支持更多角色：

```typescript
// 在 admin-middleware.ts 中
export async function checkRole(requiredRole: 'admin' | 'moderator' | 'member') {
  const user = await getUser();
  return user?.role === requiredRole;
}
```

## 部署注意事项

1. **环境变量**
   - 确保数据库连接正确配置
   - 检查文件上传路径权限

2. **依赖安装**
   - 运行 `npm install` 安装新依赖
   - 确保 `@radix-ui/react-select` 已安装

3. **数据库迁移**
   - 确保 `share_records` 表已创建
   - 设置至少一个管理员用户

## 支持和维护

### 日志监控

管理员操作会产生详细日志，建议：
- 定期检查服务器日志
- 监控异常操作
- 备份重要数据

### 性能优化

- 大量记录时考虑增加索引
- 定期清理过期数据
- 监控API响应时间

### 功能更新

未来可以考虑添加：
- 操作历史记录
- 用户行为分析
- 自动化审核规则
- 通知系统
