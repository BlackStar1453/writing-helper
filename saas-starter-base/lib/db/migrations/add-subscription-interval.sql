-- 添加订阅间隔字段来区分月付和年付用户
ALTER TABLE users ADD COLUMN subscription_interval VARCHAR(10);

-- 为现有用户设置默认值（假设现有的active用户都是月付）
UPDATE users 
SET subscription_interval = 'month' 
WHERE subscription_status = 'active' AND subscription_interval IS NULL;

-- 为lifetime用户设置为null（因为他们不是订阅用户）
UPDATE users 
SET subscription_interval = NULL 
WHERE subscription_status = 'lifetime';
