-- 添加预计完成时间字段到features表
ALTER TABLE features ADD COLUMN estimated_completion_date TIMESTAMP;

-- 为现有的planned和inDevelopment状态的功能添加一些示例预计完成时间
-- 这里只是示例，实际数据应该由管理员设置
UPDATE features 
SET estimated_completion_date = CURRENT_DATE + INTERVAL '2 months'
WHERE status = 'planned' AND estimated_completion_date IS NULL;

UPDATE features 
SET estimated_completion_date = CURRENT_DATE + INTERVAL '1 month'
WHERE status = 'inDevelopment' AND estimated_completion_date IS NULL;
