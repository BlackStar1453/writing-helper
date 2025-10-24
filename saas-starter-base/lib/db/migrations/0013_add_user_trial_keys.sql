-- 创建用户试用API Key表
CREATE TABLE IF NOT EXISTS "user_trial_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"openrouter_key_hash" varchar(255) NOT NULL,
	"openrouter_api_key" text NOT NULL,
	"usage_count" integer DEFAULT 0,
	"max_usage_count" integer DEFAULT 50,
	"credit_limit" numeric(10,6) DEFAULT '0.0001',
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- 添加外键约束
DO $$ BEGIN
 ALTER TABLE "user_trial_keys" ADD CONSTRAINT "user_trial_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 创建唯一索引，确保每个用户只有一个活跃的试用Key
CREATE UNIQUE INDEX IF NOT EXISTS "user_trial_keys_user_id_active_idx" ON "user_trial_keys" ("user_id") WHERE "is_active" = true;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "user_trial_keys_expires_at_idx" ON "user_trial_keys" ("expires_at");
CREATE INDEX IF NOT EXISTS "user_trial_keys_is_active_idx" ON "user_trial_keys" ("is_active");
CREATE INDEX IF NOT EXISTS "user_trial_keys_user_id_idx" ON "user_trial_keys" ("user_id");
