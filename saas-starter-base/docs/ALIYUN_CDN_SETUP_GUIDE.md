# 阿里云CDN配置指南 - 解决中国大陆下载速度慢问题

## 概述

本指南将帮助您配置阿里云CDN，为中国大陆用户提供高速下载体验，解决从Cloudflare R2下载速度慢的问题。

## 前置条件

- 阿里云账号（已完成实名认证）
- 已备案的域名（用于CDN加速）
- Cloudflare R2 Bucket已配置完成
- 当前CDN地址：`https://assets.elick.it.com/cdn`

## 第一步：准备工作

### 1.1 确认当前文件结构
确保您的R2 Bucket中文件结构如下：
```
/downloads/
  /v1.0.3/
    - Elick_1.0.3_x64-setup.exe
    - Elick_1.0.3_x64_x86_64.dmg
    - Elick_1.0.3_aarch64_aarch64.dmg
  latest.json
```

### 1.2 准备域名
选择一个已备案的域名用于阿里云CDN，例如：
- `cdn.yourdomain.com`
- `assets-cn.yourdomain.com`
- `download.yourdomain.com`

## 第二步：阿里云CDN配置

### 2.1 登录阿里云控制台
1. 访问 [阿里云控制台](https://ecs.console.aliyun.com/)
2. 登录您的阿里云账号
3. 搜索并进入"CDN"服务

### 2.2 添加加速域名
1. 点击"域名管理" → "添加域名"
2. 填写配置信息：
   ```
   加速域名: cdn.yourdomain.com
   业务类型: 下载加速
   源站信息: 
     - 类型: 域名
     - 域名: assets.elick.it.com
     - 端口: 443 (HTTPS)
   加速区域: 仅中国内地
   ```
3. 点击"下一步"完成添加

### 2.3 配置回源设置
1. 进入域名管理，找到刚创建的域名
2. 点击"配置" → "回源配置"
3. 设置回源HOST：
   ```
   回源HOST: assets.elick.it.com
   ```
4. 设置回源协议：
   ```
   回源协议: 跟随
   ```

### 2.4 配置缓存规则
1. 点击"缓存配置" → "缓存过期时间"
2. 添加缓存规则：
   ```
   规则1:
   - 类型: 目录
   - 内容: /downloads/
   - 过期时间: 30天
   - 权重: 90
   
   规则2:
   - 类型: 文件后缀
   - 内容: exe,dmg,zip,tar.gz
   - 过期时间: 30天
   - 权重: 80
   
   规则3:
   - 类型: 文件名
   - 内容: latest.json
   - 过期时间: 5分钟
   - 权重: 100
   ```

### 2.5 配置HTTPS
1. 点击"HTTPS配置" → "HTTPS证书"
2. 选择"免费证书"或上传您的SSL证书
3. 开启"强制跳转HTTPS"

## 第三步：DNS配置

### 3.1 获取CNAME记录
1. 在阿里云CDN控制台，复制分配的CNAME地址
2. 类似：`cdn.yourdomain.com.w.kunlunsl.com`

### 3.2 配置DNS解析
1. 登录您的域名DNS管理控制台
2. 添加CNAME记录：
   ```
   记录类型: CNAME
   主机记录: cdn
   记录值: cdn.yourdomain.com.w.kunlunsl.com
   TTL: 600
   ```

## 第四步：应用配置

### 4.1 更新环境变量
在您的 `.env.local` 文件中添加：
```env
# 中国大陆优化CDN域名
NEXT_PUBLIC_CHINA_CDN_URL=https://cdn.yourdomain.com/cdn
```

### 4.2 验证配置
1. 重启应用
2. 检查日志确认配置加载成功
3. 测试下载链接

## 第五步：测试验证

### 5.1 CDN功能测试
```bash
# 测试CDN是否正常工作
curl -I https://cdn.yourdomain.com/cdn/downloads/latest.json

# 测试文件下载
curl -I https://cdn.yourdomain.com/cdn/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe
```

### 5.2 速度对比测试
```bash
# 测试原CDN速度
time curl -o /dev/null https://assets.elick.it.com/cdn/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe

# 测试阿里云CDN速度
time curl -o /dev/null https://cdn.yourdomain.com/cdn/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe
```

### 5.3 应用内测试
1. 访问您的应用
2. 尝试下载Windows版本
3. 检查浏览器开发者工具，确认使用了阿里云CDN链接
4. 观察下载速度是否有显著提升

## 第六步：监控和优化

### 6.1 阿里云CDN监控
1. 在CDN控制台查看"数据监控"
2. 关注指标：
   - 带宽使用量
   - 请求次数
   - 命中率
   - 回源率

### 6.2 性能优化建议
1. **预热热点文件**：
   - 在CDN控制台使用"刷新预热"功能
   - 预热最新版本的安装包

2. **设置智能压缩**：
   - 开启Gzip压缩（对JSON文件有效）
   - 不压缩已压缩的文件（exe, dmg等）

3. **配置防盗链**：
   - 设置Referer白名单
   - 防止恶意盗用带宽

## 故障排除

### 常见问题

**问题1：CNAME解析不生效**
- 解决：等待DNS传播（通常5-10分钟）
- 验证：`nslookup cdn.yourdomain.com`

**问题2：回源失败**
- 检查回源HOST设置是否正确
- 确认源站（Cloudflare R2）可正常访问

**问题3：缓存不生效**
- 检查缓存规则配置
- 使用CDN控制台的"刷新缓存"功能

**问题4：HTTPS证书问题**
- 确认证书已正确配置
- 检查证书是否过期

### 联系支持
如遇到问题，可以：
1. 查看阿里云CDN官方文档
2. 提交工单联系阿里云技术支持
3. 在应用日志中查看详细错误信息

## 预期效果

配置完成后，您应该看到：
- 中国大陆用户下载速度提升 5-10 倍
- CDN命中率 > 95%
- 回源带宽大幅减少
- 用户体验显著改善

## 成本估算

阿里云CDN按使用量计费：
- 流量费用：约 ¥0.24/GB（中国内地）
- 请求费用：约 ¥0.01/万次
- 预估月成本：根据下载量，通常 ¥50-200/月

配置完成后，您的中国大陆用户将享受到高速的下载体验！

## 附录：配置检查清单

### ✅ 配置前检查
- [ ] 阿里云账号已实名认证
- [ ] 域名已完成ICP备案
- [ ] Cloudflare R2正常工作
- [ ] 确认当前CDN地址可访问

### ✅ CDN配置检查
- [ ] 加速域名已添加
- [ ] 回源HOST设置为 `assets.elick.it.com`
- [ ] 回源协议设置为"跟随"
- [ ] 缓存规则已配置
- [ ] HTTPS证书已配置
- [ ] DNS CNAME记录已添加

### ✅ 应用配置检查
- [ ] 环境变量 `NEXT_PUBLIC_CHINA_CDN_URL` 已设置
- [ ] 应用已重启
- [ ] 智能CDN选择功能正常工作

### ✅ 测试验证检查
- [ ] CDN域名可正常访问
- [ ] latest.json文件可正常获取
- [ ] 安装包文件可正常下载
- [ ] 下载速度有显著提升
- [ ] 应用内下载功能正常

### ✅ 监控配置检查
- [ ] CDN监控数据正常
- [ ] 命中率 > 90%
- [ ] 回源率 < 10%
- [ ] 错误率 < 1%

完成以上检查后，您的阿里云CDN配置就完成了！
