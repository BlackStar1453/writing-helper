# Xorpay 支付配置指南

本文档将指导您如何在项目中配置 Xorpay 支付，为中国大陆用户提供支付选择。

## 🔧 最新修复 (2024-12-30)

根据 Xorpay 官方 API 示例，已修复以下关键问题：

### 签名格式修正
- ❌ **错误格式**: `name + pay_type + price + order_id + order_uid + notify_url + secret`
- ✅ **正确格式**: `name + pay_type + price + order_id + notify_url + secret` 
- **重要**: 签名中**不包含** `order_uid` 参数

### 请求方式修正
- ❌ **错误方式**: GET 请求 + query string 参数
- ✅ **正确方式**: POST 请求 + form-encoded 数据

### 新增参数
- 添加了 `more=""` 空参数（符合官方API格式）

这些修复解决了 `sign_error` 错误，现在应该可以正常创建支付订单了。

### 响应处理修正 
- ✅ **已修复**: 正确识别成功状态 `status: 'ok'` 而非 `status: 'success'`
- ✅ **已修复**: 正确解析二维码字段 `responseData.info.qr`
- ✅ **已修复**: 支付页面现在能正确显示二维码

### 回调处理修正（根据官方文档）
- ✅ **已修复**: 正确解析 `application/x-www-form-urlencoded` 格式的回调请求
- ✅ **已修复**: 使用官方回调参数格式：`aoid`, `order_id`, `pay_price`, `pay_time`, `more`, `detail`, `sign`
- ✅ **已修复**: 签名验证使用官方格式：`aoid + order_id + pay_price + pay_time + app_secret`
- ✅ **已修复**: 返回正确的HTTP 200响应格式（简单文本而非JSON）
- ✅ **已修复**: 完善的参数验证和错误处理

### 二维码显示优化
- ✅ **已修复**: 解决URL编码导致的参数解析问题
- ✅ **已修复**: **直接使用第三方二维码生成服务，确保稳定显示**
- ✅ **已修复**: 简化显示逻辑，移除复杂的错误处理和备用方案切换
- ✅ **已修复**: 保留直接打开支付页面的选项
- ✅ **已修复**: 优化价格格式显示

## 前置条件

1. 拥有 Xorpay 账户
2. 获取 Xorpay 的 `aid` 和 `secret`

## 配置步骤

### 1. 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```bash
# Xorpay 支付配置
XORPAY_AID=your_xorpay_aid_here
XORPAY_SECRET=your_xorpay_secret_here
```

### 2. 获取 Xorpay 配置信息

1. 登录 [Xorpay 后台](https://xorpay.com/)
2. 在后台找到您的 `aid` (用户ID)
3. 在后台找到您的 `secret` (密钥)
4. 将这些信息填入环境变量

### 3. 配置回调地址

在 Xorpay 后台设置回调通知地址：

**开发环境：**
```
http://localhost:3000/api/xorpay/notify
```

**生产环境：**
```
https://yourdomain.com/api/xorpay/notify
```

## 支付流程

### 用户体验流程

1. 用户在定价页面选择方案
2. 选择"扫码支付 (国内)"选项
3. 系统创建 Xorpay 订单
4. 用户跳转到支付页面，显示二维码
5. 用户使用微信/支付宝扫码支付
6. 支付完成后，系统自动激活用户订阅

### 技术实现流程

1. **订单创建** (`lib/payments/xorpay.ts`)
   - 生成唯一订单ID
   - 创建签名
   - 调用 Xorpay API

2. **支付页面** (`src/app/[locale]/payment/xorpay/`)
   - 显示二维码
   - 轮询支付状态
   - 自动跳转

3. **回调处理** (`src/app/api/xorpay/notify/`)
   - 验证签名
   - 更新用户订阅状态
   - 激活服务

## 价格配置

在 `lib/payments/xorpay.ts` 中修改价格配置：

```typescript
const PRODUCT_PRICES = {
  'Premium': 2100,   // 21.00元 (已验证可用)
  'Lifetime': 5000,  // 50.00元 (终身会员)
};
```

**注意事项：**
- 价格以分为单位存储
- Xorpay通常要求最小金额为1元（100分）
- 建议设置合理的价格范围，过低的价格可能导致 `fee_error`

## 测试

### 配置测试

#### 1. MD5签名测试

首先测试MD5实现是否正确：

```bash
node scripts/test-md5.js
```

#### 2. Xorpay API测试

然后使用测试脚本验证您的Xorpay配置：

```bash
# 设置环境变量
export XORPAY_AID=your_aid_here
export XORPAY_SECRET=your_secret_here

# 运行API测试脚本
node scripts/test-xorpay.js
```

测试脚本会：
- 验证环境变量配置
- 使用Xorpay官方MD5算法生成签名
- 生成测试订单数据
- 调用Xorpay API
- 显示详细的调试信息

#### 3. 回调处理测试

测试回调处理是否正常工作：

```bash
# 确保开发服务器正在运行
npm run dev

# 在另一个终端中运行回调测试
export XORPAY_SECRET=your_secret_here
node scripts/test-xorpay-callback.js
```

回调测试脚本会：
- 模拟Xorpay发送的支付成功回调
- 验证签名算法是否正确
- 测试回调接口的响应
- 检查参数解析和处理逻辑

### 本地测试

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问定价页面：
   ```
   http://localhost:3000/pricing
   ```

3. 选择方案并使用 Xorpay 支付

### 回调测试

使用工具（如 ngrok）将本地服务暴露到公网：

```bash
# 安装 ngrok
npm install -g ngrok

# 暴露本地3000端口
ngrok http 3000
```

然后在 Xorpay 后台设置回调地址为：
```
https://your-ngrok-url.ngrok.io/api/xorpay/notify
```

## 部署注意事项

### 环境变量

确保在生产环境中设置正确的环境变量：

- `XORPAY_AID`
- `XORPAY_SECRET`
- `BASE_URL` (用于回调地址)

### 回调地址

确保回调地址可以从外网访问，并且配置正确的 HTTPS。

## 故障排除

### 常见问题

1. **签名验证失败 (sign_error)**
   - ✅ **已修复**: 现在使用Xorpay官方MD5算法
   - ✅ **已修复**: 修正签名格式，不包含 `order_uid`
   - ✅ **已修复**: 改用POST请求而非GET
   - 检查 `XORPAY_SECRET` 是否正确
   - 确认参数顺序：`name + pay_type + price + order_id + notify_url + secret` (不包含order_uid)
   - 运行 `node scripts/test-xorpay.js` 查看详细签名信息

2. **缺少参数 (missing_argument)**
   - ✅ **已修复**: 添加了 `order_uid` 参数
   - 确保所有必需参数都已提供

3. **金额错误 (fee_error)**
   - ✅ **已优化**: 调整了价格范围 (Premium: ¥21, Lifetime: ¥50)
   - 使用经过验证的价格，确保API调用成功
   - Xorpay 通常要求最小金额为 1 元

4. **回调未收到或处理失败**
   - ✅ **已修复**: 现在使用官方回调格式处理
   - 检查回调地址是否可访问：`/api/xorpay/notify`
   - 查看服务器日志中的详细回调信息
   - 确保回调地址使用正确的协议 (http/https)  
   - 回调签名验证现在使用官方格式：`aoid + order_id + pay_price + pay_time + secret`
   - 检查回调参数是否完整：`aoid`, `order_id`, `pay_price`, `pay_time`, `sign`

5. **订单状态异常**
   - 检查数据库中的用户状态
   - 查看 API 响应日志
   - 检查用户的 `planName` 字段格式

6. **二维码显示问题**
   - ✅ **已修复**: 支付页面现在具有完善的错误处理
   - 打开浏览器开发者工具，查看控制台日志中的支付参数
   - 如果二维码图片加载失败，页面会自动提供多种备用方案：
     - 重新加载二维码
     - 使用第三方服务生成的备用二维码
     - 直接打开支付页面链接
   - 检查网络连接和防火墙设置

### 调试日志

系统会在以下位置输出调试信息：

- 订单创建: `lib/payments/xorpay.ts`
- 回调处理: `src/app/api/xorpay/notify/route.ts`
- 状态检查: `src/app/api/xorpay/status/route.ts`

## 安全考虑

1. **签名验证**：所有回调都会验证签名
2. **HTTPS**：生产环境必须使用 HTTPS
3. **环境变量**：敏感信息通过环境变量管理
4. **订单去重**：防止重复处理同一订单

## API 端点

- `POST /api/xorpay/notify` - 支付回调通知
- `GET /api/xorpay/status?orderId=xxx` - 查询支付状态

## 数据库影响

Xorpay 集成会影响 `users` 表的以下字段：

- `planName`: 存储订阅方案名称
- `subscriptionStatus`: 存储订阅状态
- `premiumRequestsLimit`: Premium 用户的请求限制
- `fastRequestsLimit`: 快速请求限制

## 联系支持

如果遇到问题，请联系：

1. 查看项目文档
2. 检查 Xorpay 官方文档
3. 提交 GitHub Issue 

## 环境变量配置

确保在生产环境中设置以下环境变量：

```bash
# 开发环境 (.env.local)
XORPAY_AID=your_app_id_here
XORPAY_SECRET=your_app_secret_here

# 生产环境
# 在你的部署平台（Vercel、Netlify等）的环境变量中设置：
XORPAY_AID=your_app_id_here
XORPAY_SECRET=your_app_secret_here
```

⚠️ **重要**：确保 `XORPAY_SECRET` 在生产环境中正确设置，这是最常见的签名验证失败原因。

## 支付回调调试

如果遇到 "Invalid signature" 错误，按照以下步骤调试：

### 1. 检查环境变量
```bash
# 本地测试环境变量
node scripts/test-signature-debug.js
```

### 2. 检查服务器日志
部署后查看服务器日志，会输出详细的调试信息：
- 环境变量是否存在
- 回调参数解析结果
- 签名计算过程
- 参数类型检查

### 3. 常见问题排查

#### 问题1: 环境变量未设置
```
❌ XORPAY_SECRET存在: false
```
**解决**：确保在部署平台设置了正确的环境变量

#### 问题2: 参数格式问题
```
参数类型检查:
aoid_type: string ✅
pay_price_type: number ❌  // 应该是 string
```
**解决**：确保所有参数都是字符串类型

#### 问题3: 签名格式不匹配
```
计算的签名: ABC123...
收到的签名: abc123...  // 大小写不同
```
**解决**：已自动处理大小写差异

### 4. 验证实际回调数据
如果获得了实际的回调参数，可以用调试脚本验证：

```bash
node scripts/test-signature-debug.js "aoid_value" "order_id_value" "21.00" "2024-12-30 12:34:56" "received_sign"
```

## 测试流程

1. **本地测试**：
```bash
# 设置环境变量
export XORPAY_SECRET=your_secret_here
export XORPAY_AID=your_aid_here

# 测试创建订单
node scripts/test-xorpay.js

# 测试签名算法
node scripts/test-signature-debug.js
```

2. **生产环境测试**：
   - 部署代码
   - 检查环境变量设置
   - 创建真实支付订单
   - 查看服务器日志中的调试信息

## 回调URL配置

确保你的回调URL能够被Xorpay服务器访问：
- 使用 HTTPS
- URL格式：`https://yourdomain.com/api/xorpay/notify`
- 确保服务器防火墙允许Xorpay的IP访问 