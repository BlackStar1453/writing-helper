-- 创建转发记录表
CREATE TABLE IF NOT EXISTS "share_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "platform" varchar(50) NOT NULL,
  "image_url" text, -- 可选字段，简化处理时可为空
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "reward_amount" integer DEFAULT 0,
  "reward_type" varchar(20) DEFAULT 'fast',
  "submitted_at" timestamp DEFAULT now() NOT NULL,
  "verified_at" timestamp,
  "scheduled_verify_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "idx_share_records_user_id" ON "share_records" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_share_records_platform" ON "share_records" ("platform");
CREATE INDEX IF NOT EXISTS "idx_share_records_status" ON "share_records" ("status");
CREATE INDEX IF NOT EXISTS "idx_share_records_scheduled_verify_at" ON "share_records" ("scheduled_verify_at");

-- 为每个用户每个平台只能有一条已验证的记录创建唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS "idx_share_records_user_platform_verified" 
ON "share_records" ("user_id", "platform") 
WHERE "status" = 'verified';
