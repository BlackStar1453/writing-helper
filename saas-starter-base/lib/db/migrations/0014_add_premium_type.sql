-- 添加 premium_type 字段到 users 表
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "premium_type" varchar(20) DEFAULT 'use_elick';

-- 添加注释说明字段用途
COMMENT ON COLUMN "users"."premium_type" IS 'Premium subscription type: use_own_key or use_elick';
