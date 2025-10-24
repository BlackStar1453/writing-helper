# Supabase 邮箱验证配置说明

## 必要配置

### 1. Supabase Dashboard 配置

登录 Supabase Dashboard，进入你的项目设置：

#### Authentication Settings
1. 进入 `Authentication` > `Settings`
2. 在 `Site URL` 中设置：
   - **开发环境**: `http://localhost:3000`
   - **生产环境**: `https://your-domain.com`

3. 在 `Redirect URLs` 中添加：
   - **开发环境**: `http://localhost:3000/auth/callback`
   - **生产环境**: `https://your-domain.com/auth/callback`

4. **重要**: 开启 `Link accounts with the same email address` 选项
   - 这样可以自动链接相同邮箱的不同登录方式（邮箱密码 + GitHub OAuth）

#### GitHub OAuth Provider 配置
1. 进入 `Authentication` > `Providers`
2. 展开 **GitHub** 配置：
   - 开启 **GitHub Enabled**
   - 填入 **GitHub Client ID**
   - 填入 **GitHub Client Secret**
   - 确认 **Redirect URL** 为: `https://your-project-ref.supabase.co/auth/v1/callback`

#### GitHub Developer Settings
1. 登录 GitHub，进入 **Settings** → **Developer settings** → **OAuth Apps**
2. 创建或编辑 OAuth 应用：
   - **Homepage URL**: `http://localhost:3000`（开发环境）
   - **Authorization callback URL**: `https://your-project-ref.supabase.co/auth/v1/callback`

#### Google OAuth Provider 配置
1. 进入 `Authentication` > `Providers`
2. 展开 **Google** 配置：
   - 开启 **Google Enabled**
   - 填入 **Google Client ID**
   - 填入 **Google Client Secret**
   - 确认 **Redirect URL** 为: `https://your-project-ref.supabase.co/auth/v1/callback`

#### Google Cloud Console 设置
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择项目或创建新项目
3. 启用 **Google+ API** 和 **Google OAuth2 API**
4. 进入 **APIs & Services** → **Credentials**
5. 点击 **Create Credentials** → **OAuth 2.0 Client IDs**
6. 选择 **Web application**
7. 配置以下信息：
   - **Name**: 你的应用名称
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (开发环境)
     - `https://your-domain.com` (生产环境)
   - **Authorized redirect URIs**: 
     - `https://your-project-ref.supabase.co/auth/v1/callback`
8. 复制生成的 **Client ID** 和 **Client Secret** 到 Supabase Dashboard

#### Email Templates
1. 进入 `Authentication` > `Email Templates`
2. 确保 "Confirm signup" 模板的重定向URL是: `{{ .SiteURL }}/auth/callback`

### 2. 环境变量配置

确保你的 `.env.local` 文件包含以下变量：

```bash
# Supabase 配置
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 数据库（与 Supabase 相同）
POSTGRES_URL=your_supabase_postgres_connection_string
```

### 3. 数据库触发器

在 Supabase SQL Editor 中执行以下 SQL 来创建必要的触发器：

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);
```

## 验证流程

### 邮箱密码注册/登录
1. 用户填写注册表单
2. Supabase 发送验证邮件
3. 用户点击邮件中的链接
4. 重定向到 `/auth/callback` 页面
5. 页面处理访问令牌并设置会话
6. 同步用户数据到数据库
7. 重定向到 dashboard

### GitHub OAuth 登录
1. 用户点击 GitHub 登录按钮
2. 重定向到 GitHub 授权页面
3. 用户授权后重定向到 `/auth/callback`
4. 处理 OAuth 回调并设置会话
5. 如果启用了账户链接，自动链接到现有邮箱账户
6. 重定向到 dashboard

### Google OAuth 登录
1. 用户点击 Google 登录按钮
2. 重定向到 Google 授权页面
3. 用户授权后重定向到 `/auth/callback`
4. 处理 OAuth 回调并设置会话
5. 如果启用了账户链接，自动链接到现有邮箱账户
6. 重定向到 dashboard

## 故障排除

### 常见错误
- **404 错误**: 检查 GitHub OAuth 应用的回调URL配置
- **Multiple accounts error**: 在 Supabase Dashboard 中启用账户链接功能
- **重定向失败**: 检查 Supabase Dashboard 中的 Site URL 和 Redirect URLs 配置
- **用户数据同步失败**: 检查数据库触发器是否正确创建
- **查看浏览器控制台和网络面板的错误信息**

### 账户链接问题
如果遇到 "Multiple accounts with the same email address" 错误：
1. 在 Supabase Dashboard 启用账户链接（推荐）
2. 或者手动删除重复的用户账户
3. 回调页面会显示友好的错误信息和解决建议 