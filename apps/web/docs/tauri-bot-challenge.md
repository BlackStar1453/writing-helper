# Tauri 应用中的机器人校验与挑战实现指南

本文档总结在 Tauri 桌面应用中实现“机器人校验（Captcha/Turnstile）”与“计算型挑战（Proof-of-Work/Nonce 签名）”的可行方案，适用于防止注册/敏感操作被脚本化滥用。

## 目标
- 为桌面端注册、找回密码、关键写操作增加成本与可验证性
- 降低批量化滥用/薅羊毛/应用层 DoS 风险

## 方案一：嵌入 WebView 的 Turnstile（推荐）

适用场景：已有 Web 端 Turnstile 校验逻辑，服务端支持校验 token。

实现步骤：
1. 在 Tauri 客户端打开一个嵌入式 WebView（带白名单来源）加载仅用于获取 Turnstile token 的页面，例如 `/bot/turnstile`
2. 页面中集成 Cloudflare Turnstile，渲染成功后得到 `cf-turnstile-response` token
3. 通过 Tauri 的 IPC/事件通道，把 token 安全传回 Rust 端
4. 在发起敏感请求（如 /api/tauri-auth/register）时，将 token 放入请求体
5. 服务端在处理该请求最前面调用 Turnstile 校验（服务端校验密钥）

注意：
- WebView 仅访问受控页面（同源或受信任域名）；关闭导航、禁用右键与调试菜单
- token 必须短时有效，服务端冷却时间内拒绝重复使用

## 方案二：简易计算型挑战（PoW）

思路：
- 服务端下发随机 `nonce` 与难度参数 `difficulty`
- 客户端在本地计算满足 `hash(nonce + payload + salt)` 前 n 位为 0 的解（或其他约束）
- 将解和原始数据一并提交，服务端校验后放行

优点：
- 离线可计算，不依赖第三方验证码
- 可按压测随时调大/调小难度

伪代码：
- 请求挑战：`GET /api/challenge?op=signup`
- 返回：`{ nonce, difficulty, expiresAt }`
- 客户端求解：迭代 counter 找到满足约束的 `solution`
- 提交注册：`POST /api/tauri-auth/register { email, password, challenge: { nonce, solution } }`
- 服务端校验：在时间窗口内校验 `solution`，且一次性使用

## 方案三：一次性邮箱与域名单拦截（辅助手段）
- 维护常见临时邮箱域黑名单；或调用第三方邮箱质量服务
- 对注册接口的 email 做域名检查，降低垃圾账号比例

## 安全要点
- 先进行“最便宜”的校验（限流/挑战）再调用外部服务（如 Supabase）
- 对挑战的 nonce 使用一次性存储（Redis）并设置短过期
- 所有校验失败应返回一致的通用错误，避免被探测

## Tauri 客户端实现提示
- 使用 `tauri::window::WindowBuilder` 打开受控 WebView（或使用前端组件）
- 使用 `tauri::invoke` / `tauri::event` 在 WebView 与 Rust 侧传递 token/solution
- 持久化 token 不建议，建议每次敏感操作新取 token

## 服务端快速校验模板（Turnstile）
```ts
// 校验函数
async function verifyTurnstileToken(token: string, remoteIp?: string) {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: secret!,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {})
    })
  });
  const data = await resp.json();
  return !!data.success;
}
```

## 参数建议
- Turnstile：对注册等高风险操作启用，token 过期时间 < 2 分钟
- 计算型挑战：5 秒内可求解的难度起步，根据压力自动调参
- 与速率限制组合：
  - 注册：每 IP 5 分钟 1 次、每日 3 次（可调）
  - 失败冷却：失败后增加冷却时间

## 运维建议
- 在边缘/WAF 层对 /api/* 关键端点加规则：IP 信誉、地理、User-Agent 策略
- 建立告警：限流触发比率、挑战失败率、注册成功率异常波动

