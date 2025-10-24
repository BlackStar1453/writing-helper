-- 创建管理员用户的SQL脚本
-- 使用方法: psql $DATABASE_URL -f scripts/create-admin-user.sql

-- 方法1: 将现有用户设置为管理员（替换为实际的用户邮箱）
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';

-- 方法2: 查看所有用户及其角色
SELECT id, email, name, role, plan_name, created_at 
FROM users 
ORDER BY created_at DESC;

-- 方法3: 将第一个用户设置为管理员（如果只有一个用户）
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE id = (SELECT id FROM users ORDER BY created_at LIMIT 1);

-- 验证管理员用户
SELECT id, email, name, role 
FROM users 
WHERE role = 'admin';
