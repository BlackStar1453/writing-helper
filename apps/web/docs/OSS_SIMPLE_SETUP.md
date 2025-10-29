# 阿里云OSS简单配置指南

## 🎯 目标
设置整个OSS Bucket为公共读，实现最简单的文件访问方案。

## 📋 配置步骤

### 第1步：登录阿里云控制台
1. 访问 [阿里云OSS控制台](https://oss.console.aliyun.com/)
2. 登录您的阿里云账户

### 第2步：选择Bucket
1. 在Bucket列表中找到：`elick-assets-china`
2. 点击Bucket名称进入管理页面

### 第3步：设置公共读权限
1. 点击左侧菜单 **"权限管理"**
2. 点击 **"读写权限"** 标签
3. 在 **"Bucket ACL"** 部分：
   - 当前权限：私有
   - 点击 **"设置"** 按钮
   - 选择 **"公共读"**
   - 点击 **"确定"**

### 第4步：验证配置
配置完成后，测试访问已上传的文件：
```
https://elick-assets-china.oss-cn-beijing.aliyuncs.com/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe
```

如果能正常下载（而不是403错误），说明配置成功。

### 第5步：已同步的文件
✅ 以下文件已从GitHub Release同步到OSS：

**Windows安装包**:
- `Elick_1.0.3_x64-setup.exe` (8.6MB)

**macOS安装包**:
- `Elick_1.0.3_x64_x86_64.dmg` (11.7MB) - Intel Mac
- `Elick_1.0.3_aarch64_aarch64.dmg` (11.0MB) - Apple Silicon Mac
- `Elick_1.0.3_universal_universal.dmg` (22.0MB) - 通用版本

**配置文件**:
- `latest.json` (1.8KB) - 版本信息
- `updated-latest.json` (1.8KB) - 更新信息

## 🔗 文件访问格式

配置完成后，所有文件都可以通过以下格式直接访问：
```
https://elick-assets-china.oss-cn-beijing.aliyuncs.com/{文件路径}
```

### 示例URL：
- **下载文件**: `https://elick-assets-china.oss-cn-beijing.aliyuncs.com/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe`
- **图片资源**: `https://elick-assets-china.oss-cn-beijing.aliyuncs.com/assets/images/logo.png`
- **其他文件**: `https://elick-assets-china.oss-cn-beijing.aliyuncs.com/docs/manual.pdf`

## 🚀 上传文件

使用现有的上传脚本：
```bash
# 上传版本文件
./scripts/upload-to-oss.sh upload v1.0.3 ./downloads/

# 上传单个文件
./scripts/upload-to-oss.sh file ./logo.png assets/images/logo.png

# 创建latest.json
./scripts/upload-to-oss.sh latest v1.0.3
```

## ✅ 应用配置

您的应用已经配置好了，无需修改代码：

```typescript
// 自动使用OSS链接
const config = getDynamicDownloadConfig('v1.0.3');

// 生成的URL示例：
// https://elick-assets-china.oss-cn-beijing.aliyuncs.com/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe
```

## 📊 优势

✅ **最简单**：无需复杂的权限策略  
✅ **最直接**：所有文件都可以直接访问  
✅ **最快速**：无需API调用，直接下载  
✅ **最兼容**：支持所有类型的文件  
✅ **最稳定**：永久有效的链接  

## ⚠️ 注意事项

- 整个Bucket都是公共可读的
- 请不要上传敏感或私密文件
- 建议定期监控流量使用情况
- 可以考虑设置生命周期规则优化成本

## 🔧 故障排除

### 问题1：403 Forbidden
**原因**：Bucket权限未设置为公共读  
**解决**：按照上述步骤在控制台设置公共读权限

### 问题2：404 Not Found
**原因**：文件不存在  
**解决**：检查文件是否已上传，路径是否正确

### 问题3：下载速度慢
**原因**：网络或地域问题  
**解决**：确认使用的是北京地域的OSS服务

## 🎉 完成

配置完成后，您就拥有了一个简单、高效的文件分发系统：

- **中国大陆用户**：10-50MB/s 高速下载
- **全球用户**：5-20MB/s 稳定下载
- **永久链接**：可以分享、收藏、SEO友好
- **零维护**：设置一次，永久使用

立即在阿里云控制台完成设置，开始享受高速下载服务！
