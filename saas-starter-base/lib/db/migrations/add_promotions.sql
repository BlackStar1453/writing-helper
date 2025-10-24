-- 创建促销活动表
CREATE TABLE IF NOT EXISTS "promotions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "discount_type" varchar(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  "discount_value" integer NOT NULL CHECK (discount_value > 0),
  "target_plans" text NOT NULL,
  "target_payment_methods" text NOT NULL,
  "start_time" timestamp NOT NULL,
  "end_time" timestamp NOT NULL,
  "is_active" boolean DEFAULT true,
  "max_uses" integer CHECK (max_uses > 0),
  "current_uses" integer DEFAULT 0 CHECK (current_uses >= 0),
  "priority" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  CONSTRAINT "valid_time_range" CHECK ("end_time" > "start_time"),
  CONSTRAINT "valid_usage_count" CHECK ("current_uses" <= COALESCE("max_uses", "current_uses"))
);

-- 创建促销使用记录表
CREATE TABLE IF NOT EXISTS "promotion_usages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "promotion_id" uuid NOT NULL REFERENCES "promotions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_name" varchar(50) NOT NULL,
  "payment_method" varchar(20) NOT NULL,
  "original_price" integer NOT NULL CHECK (original_price > 0),
  "discount_amount" integer NOT NULL CHECK (discount_amount >= 0),
  "final_price" integer NOT NULL CHECK (final_price >= 0),
  "stripe_session_id" text,
  "xorpay_order_id" text,
  "used_at" timestamp DEFAULT now() NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "idx_promotions_active_time" ON "promotions"("is_active", "start_time", "end_time");
CREATE INDEX IF NOT EXISTS "idx_promotions_priority" ON "promotions"("priority" DESC);
CREATE INDEX IF NOT EXISTS "idx_promotions_target_plans" ON "promotions" USING gin(("target_plans"::jsonb));
CREATE INDEX IF NOT EXISTS "idx_promotion_usages_promotion_id" ON "promotion_usages"("promotion_id");
CREATE INDEX IF NOT EXISTS "idx_promotion_usages_user_id" ON "promotion_usages"("user_id");
CREATE INDEX IF NOT EXISTS "idx_promotion_usages_used_at" ON "promotion_usages"("used_at" DESC);

-- 创建触发器以自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_promotions_updated_at 
    BEFORE UPDATE ON promotions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入示例促销活动（可选）
INSERT INTO "promotions" (
  "name", 
  "description", 
  "discount_type", 
  "discount_value", 
  "target_plans", 
  "target_payment_methods", 
  "start_time", 
  "end_time",
  "max_uses",
  "priority"
) VALUES 
(
  '新年特惠', 
  '新年限时8折优惠，仅限Premium和Lifetime计划', 
  'percentage', 
  20, 
  '["Premium", "Lifetime"]', 
  '["stripe", "xorpay"]', 
  '2024-01-01 00:00:00', 
  '2024-01-31 23:59:59',
  1000,
  10
),
(
  '黑五特价', 
  'Premium计划立减$2', 
  'fixed_amount', 
  200, 
  '["Premium"]', 
  '["stripe"]', 
  '2024-11-24 00:00:00', 
  '2024-11-30 23:59:59',
  500,
  5
);
