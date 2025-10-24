-- 创建 actions 表
CREATE TABLE IF NOT EXISTS "actions" (
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- 创建 action_groups 表
CREATE TABLE IF NOT EXISTS "action_groups" (
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

-- 创建 action_group_relations 表
CREATE TABLE IF NOT EXISTS "action_group_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" integer NOT NULL,
	"group_id" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 添加外键约束
DO $$ BEGIN
 ALTER TABLE "actions" ADD CONSTRAINT "actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "action_group_relations" ADD CONSTRAINT "action_group_relations_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "action_group_relations" ADD CONSTRAINT "action_group_relations_group_id_action_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "action_groups"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "actions_user_id_idx" ON "actions" ("user_id");
CREATE INDEX IF NOT EXISTS "actions_idx_idx" ON "actions" ("idx");
CREATE INDEX IF NOT EXISTS "actions_is_frequently_used_idx" ON "actions" ("is_frequently_used");
CREATE INDEX IF NOT EXISTS "action_groups_language_idx" ON "action_groups" ("language");
CREATE INDEX IF NOT EXISTS "action_groups_category_idx" ON "action_groups" ("category");
CREATE INDEX IF NOT EXISTS "action_group_relations_action_id_idx" ON "action_group_relations" ("action_id");
CREATE INDEX IF NOT EXISTS "action_group_relations_group_id_idx" ON "action_group_relations" ("group_id");

-- 插入内置 action groups
INSERT INTO "action_groups" ("id", "title", "description", "category", "price", "version", "language") VALUES
('builtin-en', 'Built-in Actions', 'Default built-in actions for common tasks', 'system', 0, '1.0.0', 'en'),
('builtin-zh-hans', '内置操作', '常用任务的默认内置操作', 'system', 0, '1.0.0', 'zh-Hans'),
('builtin-zh-hant', '內置操作', '常用任務的默認內置操作', 'system', 0, '1.0.0', 'zh-Hant'),
('programming-en', 'Programming', 'Actions for programming and development', 'development', 0, '1.0.0', 'en'),
('programming-zh-hans', '编程', '编程和开发相关的操作', 'development', 0, '1.0.0', 'zh-Hans'),
('programming-zh-hant', '編程', '編程和開發相關的操作', 'development', 0, '1.0.0', 'zh-Hant'),
('communication-en', 'Communication', 'Actions for communication and writing', 'productivity', 0, '1.0.0', 'en'),
('communication-zh-hans', '沟通', '沟通和写作相关的操作', 'productivity', 0, '1.0.0', 'zh-Hans'),
('communication-zh-hant', '溝通', '溝通和寫作相關的操作', 'productivity', 0, '1.0.0', 'zh-Hant')
ON CONFLICT ("id") DO NOTHING;
