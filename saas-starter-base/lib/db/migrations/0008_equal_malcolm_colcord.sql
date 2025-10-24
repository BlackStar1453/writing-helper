-- 添加订阅间隔字段
DO $$
BEGIN
    -- 检查字段是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'subscription_interval'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "subscription_interval" varchar(10);

        -- 为现有用户设置默认值
        UPDATE "users"
        SET "subscription_interval" = 'month'
        WHERE "subscription_status" = 'active' AND "subscription_interval" IS NULL;

        -- 为lifetime用户设置为null
        UPDATE "users"
        SET "subscription_interval" = NULL
        WHERE "subscription_status" = 'lifetime';

        RAISE NOTICE 'subscription_interval字段添加成功';
    ELSE
        RAISE NOTICE 'subscription_interval字段已存在，跳过';
    END IF;
END $$;