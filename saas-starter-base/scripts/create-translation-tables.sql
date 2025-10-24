-- 创建功能翻译表
CREATE TABLE IF NOT EXISTS feature_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建唯一索引，确保每个功能的每种语言只有一个翻译
CREATE UNIQUE INDEX IF NOT EXISTS feature_translations_feature_locale_idx 
ON feature_translations(feature_id, locale);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS feature_translations_locale_idx ON feature_translations(locale);
CREATE INDEX IF NOT EXISTS feature_translations_feature_id_idx ON feature_translations(feature_id);

-- 添加注释
COMMENT ON TABLE feature_translations IS '功能多语言翻译表';
COMMENT ON COLUMN feature_translations.feature_id IS '关联的功能ID';
COMMENT ON COLUMN feature_translations.locale IS '语言代码，如 zh, ja, ko 等';
COMMENT ON COLUMN feature_translations.title IS '翻译后的标题';
COMMENT ON COLUMN feature_translations.description IS '翻译后的描述';

-- 插入一些示例翻译数据（可选）
-- 注意：这里的feature_id需要替换为实际的功能ID

-- 示例：为"快速搜索功能"添加中文翻译
-- INSERT INTO feature_translations (feature_id, locale, title, description) 
-- VALUES (
--     'your-feature-id-here',
--     'zh',
--     '快速搜索功能',
--     '当创建的功能比较多时，可能会无法快速找到需要的功能，所以需要新增一个快速搜索功能，通过这个来快速找到并使用功能。'
-- );

-- 示例：为"单词本功能"添加日文翻译
-- INSERT INTO feature_translations (feature_id, locale, title, description) 
-- VALUES (
--     'your-feature-id-here',
--     'ja',
--     '単語帳機能',
--     '単語検索過程で学習と復習が必要な内容を単語帳に追加します。'
-- );
