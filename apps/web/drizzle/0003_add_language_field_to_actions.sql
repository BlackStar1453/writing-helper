-- 为 actions 表添加 language 字段
ALTER TABLE "actions" ADD COLUMN "language" varchar(10) DEFAULT 'en';

-- 为 language 字段创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "actions_language_idx" ON "actions" ("language");

-- 创建复合索引用于按用户和语言查询
CREATE INDEX IF NOT EXISTS "actions_user_language_idx" ON "actions" ("user_id", "language");

-- 创建复合索引用于内置actions的语言查询
CREATE INDEX IF NOT EXISTS "actions_builtin_language_idx" ON "actions" ("user_id", "language") WHERE "user_id" IS NULL;

-- 更新现有数据的语言字段
-- 根据action名称中的字符来判断语言
UPDATE "actions" SET "language" = 
  CASE 
    -- 中文简体：包含简体中文字符
    WHEN "name" ~ '[\u4e00-\u9fff]' AND ("name" LIKE '%译%' OR "name" LIKE '%释%' OR "name" LIKE '%图%') THEN 'zh-Hans'
    -- 中文繁体：包含繁体中文字符
    WHEN "name" ~ '[\u4e00-\u9fff]' AND ("name" LIKE '%譯%' OR "name" LIKE '%釋%' OR "name" LIKE '%圖%') THEN 'zh-Hant'
    -- 日文：包含平假名或片假名
    WHEN "name" ~ '[\u3040-\u309f\u30a0-\u30ff]' THEN 'ja'
    -- 韩文：包含韩文字符
    WHEN "name" ~ '[\uac00-\ud7af]' THEN 'ko'
    -- 阿拉伯文：包含阿拉伯文字符
    WHEN "name" ~ '[\u0600-\u06ff]' THEN 'ar'
    -- 印地文：包含天城文字符
    WHEN "name" ~ '[\u0900-\u097f]' THEN 'hi'
    -- 泰文：包含泰文字符
    WHEN "name" ~ '[\u0e00-\u0e7f]' THEN 'th'
    -- 法文：根据特定词汇判断
    WHEN "name" LIKE '%Expliquer%' OR "name" LIKE '%Traduire%' OR "name" LIKE '%contexte%' THEN 'fr'
    -- 德文：根据特定词汇判断
    WHEN "name" LIKE '%erklären%' OR "name" LIKE '%Übersetzen%' OR "name" LIKE '%Kontext%' THEN 'de'
    -- 俄文：包含西里尔字符
    WHEN "name" ~ '[\u0400-\u04ff]' THEN 'ru'
    -- 默认为英文
    ELSE 'en'
  END
WHERE "language" = 'en'; -- 只更新默认值为en的记录

-- 添加注释
COMMENT ON COLUMN "actions"."language" IS 'Language code for the action (e.g., en, zh-Hans, zh-Hant, ja, ko, fr, de, ru, ar, hi, th)';
