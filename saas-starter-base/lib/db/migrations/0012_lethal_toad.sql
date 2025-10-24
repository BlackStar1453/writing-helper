CREATE TABLE "action_group_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" integer NOT NULL,
	"group_id" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_groups" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"price" integer DEFAULT 0,
	"version" varchar(50) NOT NULL,
	"language" varchar(10) DEFAULT 'en',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"idx" integer NOT NULL,
	"mode" varchar(50),
	"name" varchar(255) NOT NULL,
	"model" varchar(100),
	"groups" text NOT NULL,
	"icon" varchar(100),
	"role_prompt" text,
	"command_prompt" text,
	"output_rendering_format" varchar(50),
	"parent_ids" text,
	"children_ids" text,
	"use_background_info" boolean DEFAULT false,
	"use_language_level_info" boolean DEFAULT false,
	"is_frequently_used" boolean DEFAULT false,
	"language" varchar(10) DEFAULT 'en',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booster_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"stripe_price" integer NOT NULL,
	"xorpay_price" integer NOT NULL,
	"is_popular" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"reward_amount" integer DEFAULT 100,
	"reward_type" varchar(20) DEFAULT 'fast',
	"share_url" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "share_platforms_platform_id_unique" UNIQUE("platform_id")
);
--> statement-breakpoint
ALTER TABLE "action_group_relations" ADD CONSTRAINT "action_group_relations_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_group_relations" ADD CONSTRAINT "action_group_relations_group_id_action_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."action_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_translations" ADD CONSTRAINT "feature_translations_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feature_translations_feature_locale_idx" ON "feature_translations" USING btree ("feature_id","locale");