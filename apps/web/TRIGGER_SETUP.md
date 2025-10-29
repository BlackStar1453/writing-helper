# 数据库触发器设置指南

## 📋 设置步骤

### 1. 在Supabase Dashboard中执行SQL

1. 登录到 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 点击左侧菜单的 **SQL Editor**
4. 复制下方的SQL代码并执行

### 2. 执行以下SQL代码

```sql
-- 更新的触发器函数，包含所有必要字段
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    name, 
    role,
    created_at,
    updated_at,
    premium_requests_used,
    premium_requests_limit,
    fast_requests_limit,
    fast_requests_used,
    usage_last_reset_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'preferred_username',
      split_part(NEW.email, '@', 1)
    ), 
    'owner',  -- 默认角色为owner
    NOW(),    -- created_at
    NOW(),    -- updated_at  
    0,        -- premium_requests_used
    50,       -- premium_requests_limit
    150,      -- fast_requests_limit
    0,        -- fast_requests_used
    NOW()     -- usage_last_reset_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 确保RLS策略正确
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 创建新的RLS策略
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 可选：创建插入策略（如果需要用户自己插入数据）
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 3. 验证触发器

执行以下查询验证触发器是否正常工作：

```sql
-- 检查触发器是否存在
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 检查现有用户记录
SELECT id, email, name, role, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;
```

## ✅ 完成

执行完以上SQL后，新的Google OAuth登录流程将自动工作：

1. **用户通过Google OAuth登录**
2. **Supabase自动创建auth.users记录**
3. **触发器自动创建public.users记录** ← 新的自动化步骤
4. **用户被重定向到dashboard**

## 🎯 优势

- ✅ **更快**：无需API调用，直接数据库操作
- ✅ **更可靠**：数据库事务保证数据一致性
- ✅ **更简单**：无需维护额外的API端点
- ✅ **自动化**：触发器自动处理所有新用户

## 🔧 故障排除

如果遇到问题：

1. **检查触发器是否正确创建**：
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. **检查函数是否存在**：
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

3. **手动测试触发器**：
   ```sql
   -- 注意：这只是测试，不要在生产环境运行
   SELECT public.handle_new_user();
   ``` 