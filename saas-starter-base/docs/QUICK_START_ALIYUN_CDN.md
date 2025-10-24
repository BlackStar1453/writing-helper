# 阿里云CDN快速配置指南 ⚡

> 5分钟快速配置，解决中国大陆用户下载速度慢问题

## 🚀 快速开始

### 第1步：准备工作 (1分钟)
- ✅ 确保有阿里云账号（已实名认证）
- ✅ 准备一个已备案的域名
- ✅ 记录当前CDN地址：`https://assets.elick.it.com/cdn`

### 第2步：创建CDN (2分钟)
1. 登录 [阿里云CDN控制台](https://cdn.console.aliyun.com/)
2. 点击"添加域名"
3. 填写配置：
   ```
   加速域名: cdn.yourdomain.com
   业务类型: 下载加速
   源站类型: 域名
   源站地址: assets.elick.it.com
   端口: 443
   ```
4. 点击"下一步"完成

### 第3步：配置DNS (1分钟)
1. 复制阿里云分配的CNAME地址
2. 在您的DNS服务商添加CNAME记录：
   ```
   类型: CNAME
   名称: cdn
   值: [阿里云分配的CNAME地址]
   ```

### 第4步：更新应用配置 (1分钟)
在 `.env.local` 文件中添加：
```env
NEXT_PUBLIC_CHINA_CDN_URL=https://cdn.yourdomain.com/cdn
```

### 第5步：测试验证 (1分钟)
运行测试脚本：
```bash
./scripts/test-cdn-setup.sh
```

## ✅ 完成！

配置完成后，中国大陆用户下载速度将提升 **5-10倍**！

## 🔧 高级配置（可选）

### 缓存优化
在CDN控制台设置缓存规则：
- `/downloads/` → 30天
- `exe,dmg,zip` → 30天  
- `latest.json` → 5分钟

### HTTPS配置
1. 在CDN控制台配置SSL证书
2. 开启"强制HTTPS跳转"

### 性能监控
关注CDN控制台中的：
- 命中率 (目标: >95%)
- 回源率 (目标: <5%)
- 带宽使用量

## 🆘 常见问题

**Q: DNS解析不生效？**
A: 等待5-10分钟DNS传播，使用 `nslookup cdn.yourdomain.com` 验证

**Q: 回源失败？**
A: 检查源站地址是否为 `assets.elick.it.com`，端口443

**Q: 下载还是很慢？**
A: 检查缓存规则，使用CDN控制台"刷新缓存"功能

## 💰 成本预估

- 流量费用：¥0.24/GB
- 请求费用：¥0.01/万次
- 预估月成本：¥50-200（根据使用量）

## 📞 技术支持

- 📖 详细文档：`docs/ALIYUN_CDN_SETUP_GUIDE.md`
- 🧪 测试脚本：`scripts/test-cdn-setup.sh`
- 🎯 配置检查：参考详细文档中的检查清单

---

**🎉 恭喜！您已成功为中国大陆用户提供高速下载体验！**
