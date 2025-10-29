# 阿里云OSS配置指南 - 高速下载解决方案

## 概述

使用阿里云OSS作为下载文件存储，为中国大陆用户提供高速下载体验，解决GitHub Release下载速度慢的问题。

## 第一步：OSS Bucket配置

### 1.1 创建Bucket
1. 登录 [阿里云OSS控制台](https://oss.console.aliyun.com/)
2. 点击"创建Bucket"
3. 配置参数：
   ```
   Bucket名称: elick-downloads (或您的自定义名称)
   地域: 华东1（杭州）或就近地域
   存储类型: 标准存储
   读写权限: 公共读
   版本控制: 关闭
   ```

### 1.2 设置跨域规则（CORS）
在Bucket管理 → 权限管理 → 跨域设置中添加：
```json
{
  "allowedOrigins": ["*"],
  "allowedMethods": ["GET", "HEAD"],
  "allowedHeaders": ["*"],
  "exposeHeaders": ["Content-Length", "Content-Type"],
  "maxAgeSeconds": 3600
}
```

## 第二步：权限策略配置

### 2.1 创建RAM用户（推荐）
1. 进入 [RAM控制台](https://ram.console.aliyun.com/)
2. 创建用户：
   ```
   用户名: elick-oss-uploader
   访问方式: 编程访问
   ```
3. 保存AccessKey ID和AccessKey Secret

### 2.2 创建自定义权限策略
在RAM控制台 → 权限管理 → 权限策略管理中创建：

**策略名称**: `ElickOSSUploadPolicy`

**策略内容**:
```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:PutObjectAcl",
        "oss:GetObject",
        "oss:GetObjectAcl",
        "oss:ListObjects",
        "oss:DeleteObject"
      ],
      "Resource": [
        "acs:oss:*:*:elick-downloads",
        "acs:oss:*:*:elick-downloads/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "oss:ListBuckets",
        "oss:GetBucketLocation",
        "oss:GetBucketInfo"
      ],
      "Resource": "acs:oss:*:*:elick-downloads"
    }
  ]
}
```

### 2.3 为RAM用户授权
1. 在RAM控制台找到创建的用户
2. 点击"添加权限"
3. 选择自定义策略 `ElickOSSUploadPolicy`

## 第三步：文件上传和目录结构

### 3.1 推荐的目录结构
```
elick-downloads/
├── downloads/
│   ├── v1.0.3/
│   │   ├── Elick_1.0.3_x64-setup.exe
│   │   ├── Elick_1.0.3_x64.dmg
│   │   └── Elick_1.0.3_aarch64.dmg
│   └── latest.json
└── assets/
    └── (其他资源文件)
```

### 3.2 使用阿里云CLI上传
安装阿里云CLI：
```bash
# macOS
brew install aliyun-cli

# 配置
aliyun configure
```

上传文件：
```bash
# 上传单个文件
aliyun oss cp local-file.exe oss://elick-downloads/downloads/v1.0.3/

# 批量上传
aliyun oss sync ./local-downloads/ oss://elick-downloads/downloads/v1.0.3/ --recursive
```

### 3.3 使用OSS Browser工具
1. 下载 [OSS Browser](https://help.aliyun.com/document_detail/61872.html)
2. 使用AccessKey登录
3. 拖拽上传文件到对应目录

## 第四步：应用配置

### 4.1 环境变量配置
在 `.env.local` 中添加：
```env
# 阿里云OSS配置
NEXT_PUBLIC_ALIYUN_OSS_ENDPOINT=https://elick-downloads.oss-cn-hangzhou.aliyuncs.com
NEXT_PUBLIC_ALIYUN_OSS_BUCKET=elick-downloads
NEXT_PUBLIC_ALIYUN_OSS_REGION=oss-cn-hangzhou

# 用于服务端操作（可选）
ALIYUN_OSS_ACCESS_KEY_ID=your_access_key_id
ALIYUN_OSS_ACCESS_KEY_SECRET=your_access_key_secret
```

### 4.2 下载URL格式
文件访问URL格式：
```
https://elick-downloads.oss-cn-hangzhou.aliyuncs.com/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe
```

## 第五步：CDN加速（可选）

### 5.1 开启阿里云CDN
1. 在OSS控制台 → 传输管理 → 域名管理
2. 绑定自定义域名（需要已备案）
3. 开启CDN加速

### 5.2 CDN配置
```
加速域名: download.yourdomain.com
源站类型: OSS域名
源站域名: elick-downloads.oss-cn-hangzhou.aliyuncs.com
```

使用CDN后的URL：
```
https://download.yourdomain.com/downloads/v1.0.3/Elick_1.0.3_x64-setup.exe
```

## 第六步：安全建议

### 6.1 访问控制
- 使用RAM用户而非主账号AccessKey
- 定期轮换AccessKey
- 启用MFA（多因素认证）

### 6.2 防盗链设置
在OSS控制台 → 权限管理 → 防盗链中设置：
```
Referer白名单: *.yourdomain.com
允许空Referer: 是（用于直接访问）
```

### 6.3 访问日志
开启访问日志记录，监控下载情况：
```
日志存储位置: elick-downloads/logs/
```

## 第七步：成本优化

### 7.1 存储类型选择
- **标准存储**: 频繁访问的文件（最新版本）
- **低频访问**: 较旧版本的文件
- **归档存储**: 历史版本备份

### 7.2 生命周期规则
设置自动转换存储类型：
```
规则: downloads/v*/
30天后转为低频访问
90天后转为归档存储
```

## 预期效果

配置完成后：
- **中国大陆下载速度**: 10-50MB/s
- **全球访问速度**: 5-20MB/s  
- **月成本预估**: ¥20-100（根据流量）
- **可用性**: 99.9%+

## 故障排除

### 常见问题
1. **403权限错误**: 检查Bucket权限和RAM用户权限
2. **跨域错误**: 配置CORS规则
3. **下载慢**: 考虑开启CDN加速
4. **成本高**: 设置生命周期规则和防盗链

配置完成后，您将拥有一个高速、稳定、成本可控的下载服务！
