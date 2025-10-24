# 管理员权限管理系统

## 概述

本系统提供了完整的管理员权限管理功能，包括权限检查、页面保护、API保护和用户管理工具。

## 权限系统架构

### 1. 数据库层面
- 用户表中的 `role` 字段控制用户角色
- 支持的角色：`member`（默认）、`admin`

### 2. 服务端权限检查
- `lib/auth/admin.ts` - 核心权限检查函数
- `requireAdmin()` - 页面级权限保护
- `adminMiddleware()` - API路由权限保护

### 3. 客户端权限检查
- `hooks/use-admin.ts` - React Hook
- `components/admin/admin-guard.tsx` - 权限保护组件

## 使用方法

### 🔧 设置管理员权限

#### 方法1：使用命令行工具（推荐）
```bash
# 查看所有用户
npm run admin:list

# 设置用户为管理员
npm run admin:set user@example.com

# 移除管理员权限
npm run admin:remove user@example.com
```

#### 方法2：直接数据库操作
```sql
-- 设置管理员
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

-- 移除管理员权限
UPDATE users SET role = 'member' WHERE email = 'your-email@example.com';

-- 查看所有管理员
SELECT id, email, name, role FROM users WHERE role = 'admin';
```

### 🛡️ 页面权限保护

#### 服务端组件（推荐）
```typescript
import { requireAdmin } from '@/lib/auth/admin';

export default async function AdminPage() {
  // 自动检查权限，非管理员会被重定向
  await requireAdmin();
  
  return (
    <div>
      <h1>管理员专用页面</h1>
      {/* 管理员内容 */}
    </div>
  );
}
```

#### 客户端组件
```typescript
import { AdminGuard } from '@/components/admin/admin-guard';

export default function ClientAdminPage() {
  return (
    <AdminGuard>
      <div>
        <h1>管理员专用页面</h1>
        {/* 管理员内容 */}
      </div>
    </AdminGuard>
  );
}
```

### 🔒 API路由保护

```typescript
import { adminMiddleware } from '@/lib/auth/admin';

export async function GET() {
  const userOrError = await adminMiddleware();
  
  if (userOrError instanceof Response) {
    return userOrError; // 返回错误响应
  }
  
  // userOrError 是管理员用户对象
  // 执行管理员操作...
}
```

### 🎨 UI组件权限控制

#### 条件渲染管理员内容
```typescript
import { AdminOnly } from '@/components/admin/admin-guard';

export function SomeComponent() {
  return (
    <div>
      <h1>普通内容</h1>
      
      <AdminOnly>
        <button>管理员专用按钮</button>
      </AdminOnly>
    </div>
  );
}
```

#### 显示管理员标识
```typescript
import { AdminBadge } from '@/components/admin/admin-guard';

export function UserProfile() {
  return (
    <div className="flex items-center space-x-2">
      <span>用户名</span>
      <AdminBadge />
    </div>
  );
}
```

### 📊 使用React Hook检查权限

```typescript
import { useAdmin } from '@/hooks/use-admin';

export function MyComponent() {
  const { isAdmin, loading, error } = useAdmin();
  
  if (loading) return <div>检查权限中...</div>;
  if (error) return <div>权限检查失败: {error}</div>;
  
  return (
    <div>
      {isAdmin ? (
        <button>管理员功能</button>
      ) : (
        <p>您不是管理员</p>
      )}
    </div>
  );
}
```

## 现有管理功能

### 1. 促销活动管理
- 路径：`/admin/promotions`
- 功能：创建、编辑、删除、统计促销活动
- 权限：仅管理员可访问

### 2. 用户管理（待开发）
- 路径：`/admin/users`
- 功能：查看用户列表、修改用户角色、用户统计

### 3. 数据分析（待开发）
- 路径：`/admin/analytics`
- 功能：系统使用统计、收入分析、用户行为分析

## 安全考虑

### 1. 多层权限验证
- 前端UI隐藏（用户体验）
- 页面级权限检查（防止直接访问）
- API级权限验证（数据安全）

### 2. 错误处理
- 权限不足时优雅降级
- 详细的错误日志记录
- 用户友好的错误提示

### 3. 审计日志（建议实现）
```sql
-- 建议添加管理员操作日志表
CREATE TABLE admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id),
  action varchar(100) NOT NULL,
  target_type varchar(50),
  target_id varchar(100),
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp DEFAULT now()
);
```

## 故障排除

### 常见问题

1. **无法访问管理员页面**
   - 检查用户role是否为'admin'
   - 确认用户已登录
   - 查看浏览器控制台错误

2. **权限检查失败**
   - 检查数据库连接
   - 确认用户表结构正确
   - 查看服务器日志

3. **API返回401/403错误**
   - 确认请求包含有效的认证信息
   - 检查用户角色设置
   - 验证API路由权限中间件

### 调试命令

```bash
# 检查用户列表和角色
npm run admin:list

# 查看数据库中的用户角色
psql $POSTGRES_URL -c "SELECT email, role FROM users WHERE role = 'admin';"

# 检查促销表权限
psql $POSTGRES_URL -c "SELECT * FROM promotions LIMIT 5;"
```

## 扩展功能

### 1. 角色细分
可以扩展更多角色类型：
- `super_admin` - 超级管理员
- `moderator` - 版主
- `support` - 客服

### 2. 权限粒度控制
可以实现更细粒度的权限控制：
- 功能级权限（如：只能查看不能编辑）
- 数据级权限（如：只能管理自己创建的内容）

### 3. 权限继承
实现角色权限继承机制：
```typescript
const roleHierarchy = {
  super_admin: ['admin', 'moderator', 'member'],
  admin: ['moderator', 'member'],
  moderator: ['member'],
  member: []
};
```

---

## 快速开始

1. **设置您的管理员权限**：
   ```bash
   npm run admin:set your-email@example.com
   ```

2. **访问管理员界面**：
   - 登录后访问 `/admin/promotions`
   - 查看管理员导航面板

3. **开始管理促销活动**：
   - 创建新的促销活动
   - 查看促销统计数据
   - 管理活动状态

现在您已经拥有完整的管理员权限系统！🎉
