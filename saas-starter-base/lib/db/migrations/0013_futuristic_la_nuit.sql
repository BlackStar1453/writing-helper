CREATE TABLE "user_trial_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"openrouter_key_hash" varchar(255) NOT NULL,
	"openrouter_api_key" text NOT NULL,
	"usage_count" integer DEFAULT 0,
	"max_usage_count" integer DEFAULT 50,
	"credit_limit" numeric(10, 6) DEFAULT '0.0001',
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "estimated_completion_date" timestamp;--> statement-breakpoint
ALTER TABLE "user_trial_keys" ADD CONSTRAINT "user_trial_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_trial_keys_user_id_active_idx" ON "user_trial_keys" USING btree ("user_id");