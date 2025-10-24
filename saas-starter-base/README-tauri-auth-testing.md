# Tauri 认证系统测试指南

## 概述

本项目已实现完整的 Tauri 客户端邮箱密码登录系统，包括 4 个 API 端点和完整的测试套件。

## 已实现的 API 端点

1. **`/api/tauri-auth/login`** - 用户登录
2. **`/api/tauri-auth/register`** - 用户注册  
3. **`/api/tauri-auth/verify-token`** - 令牌验证
4. **`/api/tauri-auth/refresh-user`** - 用户信息刷新

## 测试脚本

### 1. 数据库设置检查
```bash
npm run test:tauri-setup
```
检查：
- 服务器连接
- 数据库连接
- 用户表结构
- Supabase 配置

### 2. API 端点逐步测试
```bash
npm run test:tauri-api
```
测试：
- 注册端点
- 登录端点
- 令牌验证端点
- 用户信息刷新端点
- 错误处理

### 3. 客户端集成测试
```bash
npm run test:tauri-integration
```
模拟：
- 新用户注册流程
- 现有用户登录流程
- 应用生命周期
- 错误场景处理

### 4. 完整测试套件
```bash
npm run test:tauri-all
```
运行所有测试并生成详细报告

### 5. 快速测试
```bash
npm run test:tauri-quick
```
运行设置检查和API测试

## 测试前准备

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **确保环境变量配置正确**
   检查 `.env.local` 文件中的：
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **运行数据库迁移**
   ```bash
   npm run db:migrate
   ```

## 测试步骤

### 第一步：检查基础设置
```bash
npm run test:tauri-setup
```
确保所有基础设施正常工作

### 第二步：测试 API 端点
```bash
npm run test:tauri-api
```
验证所有 API 端点功能正确

### 第三步：测试集成流程
```bash
npm run test:tauri-integration
```
验证完整的用户认证流程

## 故障排除

### 服务器连接失败
- 确保运行 `npm run dev`
- 检查端口 3000 是否被占用
- 确认没有防火墙阻止

### 数据库连接失败
- 检查 `DATABASE_URL` 环境变量
- 运行 `npm run db:setup`
- 确认数据库服务器运行正常

### Supabase 认证失败
- 检查 Supabase 项目配置
- 验证 `SUPABASE_SERVICE_ROLE_KEY`
- 确认 Supabase Auth 已启用

### API 测试失败
- 检查控制台错误日志
- 验证用户表结构
- 确认 JWT 密钥配置

## 自定义测试配置

### 修改测试目标 URL
```bash
node test-api-endpoints-step-by-step.js --base-url https://your-api.com
```

### 修改测试用户
编辑测试脚本中的 `CONFIG.testUser` 对象

### 生成测试报告
```bash
node run-all-tauri-tests.js --base-url http://localhost:3000
```
报告将保存为 `tauri-auth-test-report.json`

## 下一步

测试通过后，您可以：

1. 参考 `tauri-auth-implementation-guide.md` 实现 Tauri 客户端
2. 使用 `api-endpoints-for-tauri-auth.md` 了解 API 详细规范
3. 根据测试结果调整和优化实现

## 测试文件说明

- `test-database-setup.js` - 数据库和环境检查
- `test-api-endpoints-step-by-step.js` - API 端点逐步测试
- `test-tauri-client-integration.js` - 客户端集成测试
- `run-all-tauri-tests.js` - 完整测试套件
- `tauri-auth-implementation-guide.md` - 实现指南
- `api-endpoints-for-tauri-auth.md` - API 规范
