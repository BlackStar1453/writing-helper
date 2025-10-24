-- 创建联系消息表
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    message TEXT NOT NULL,
    anonymous BOOLEAN DEFAULT false,
    category VARCHAR(20) DEFAULT 'other',
    priority VARCHAR(10) DEFAULT 'medium',
    user_agent TEXT,
    ip_address INET,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    admin_notes TEXT
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON contact_messages(category);
CREATE INDEX IF NOT EXISTS idx_contact_messages_priority ON contact_messages(priority);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email) WHERE email IS NOT NULL;

-- 启用行级安全性
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 只有管理员可以查看所有联系消息
CREATE POLICY "只有管理员可以查看联系消息" ON contact_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 只有管理员可以更新联系消息
CREATE POLICY "只有管理员可以更新联系消息" ON contact_messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 允许系统插入新的联系消息（通过服务角色）
CREATE POLICY "系统可以插入联系消息" ON contact_messages
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- 创建触发器来自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER contact_messages_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_messages_updated_at();

-- 创建一个视图来显示联系消息的统计信息
CREATE OR REPLACE VIEW contact_messages_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_messages,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_messages,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_messages,
    COUNT(*) FILTER (WHERE anonymous = true) as anonymous_messages,
    COUNT(*) FILTER (WHERE category = 'bug') as bug_reports,
    COUNT(*) FILTER (WHERE category = 'feature') as feature_requests,
    COUNT(*) FILTER (WHERE category = 'question') as questions,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
    COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
    COUNT(*) FILTER (WHERE priority = 'low') as low_priority
FROM contact_messages
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- 授予管理员查看统计信息的权限
GRANT SELECT ON contact_messages_stats TO authenticated;

-- 创建一个函数来标记消息为已解决
CREATE OR REPLACE FUNCTION resolve_contact_message(
    message_id UUID,
    admin_id UUID,
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- 检查调用者是否为管理员
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = admin_id 
        AND users.role = 'admin'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- 更新消息状态
    UPDATE contact_messages 
    SET 
        status = 'resolved',
        resolved_at = NOW(),
        resolved_by = admin_id,
        admin_notes = notes
    WHERE id = message_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予管理员执行此函数的权限
GRANT EXECUTE ON FUNCTION resolve_contact_message TO authenticated; 