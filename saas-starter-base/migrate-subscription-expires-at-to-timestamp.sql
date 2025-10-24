-- 迁移subscriptionExpiresAt字段从timestamp到bigint时间戳
-- 这个脚本需要在数据库中手动执行

-- 1. 首先添加新的bigint字段
ALTER TABLE users ADD COLUMN subscription_expires_at_new BIGINT;

-- 2. 将现有的timestamp数据转换为时间戳并复制到新字段
UPDATE users 
SET subscription_expires_at_new = EXTRACT(EPOCH FROM subscription_expires_at) * 1000
WHERE subscription_expires_at IS NOT NULL;

-- 3. 删除旧的timestamp字段
ALTER TABLE users DROP COLUMN subscription_expires_at;

-- 4. 重命名新字段为原字段名
ALTER TABLE users RENAME COLUMN subscription_expires_at_new TO subscription_expires_at;

-- 验证迁移结果
SELECT 
  id, 
  email, 
  subscription_expires_at,
  CASE 
    WHEN subscription_expires_at IS NOT NULL 
    THEN to_timestamp(subscription_expires_at / 1000)::timestamp 
    ELSE NULL 
  END as converted_back_to_date
FROM users 
WHERE subscription_expires_at IS NOT NULL 
LIMIT 5;
