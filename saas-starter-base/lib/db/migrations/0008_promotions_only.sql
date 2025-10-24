CREATE TABLE IF NOT EXISTS "promotion_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_name" varchar(50) NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"original_price" integer NOT NULL,
	"discount_amount" integer NOT NULL,
	"final_price" integer NOT NULL,
	"stripe_session_id" text,
	"xorpay_order_id" text,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"discount_type" varchar(20) NOT NULL,
	"discount_value" integer NOT NULL,
	"target_plans" text NOT NULL,
	"target_payment_methods" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotion_usages" ADD CONSTRAINT "promotion_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "idx_promotions_active_time" ON "promotions"("is_active", "start_time", "end_time");
CREATE INDEX IF NOT EXISTS "idx_promotions_priority" ON "promotions"("priority" DESC);
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

DO $$ BEGIN
    CREATE TRIGGER update_promotions_updated_at 
        BEFORE UPDATE ON promotions 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
