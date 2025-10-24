# 下载文件目录

这个目录用于存放应用程序的下载文件。

## 文件结构

```
public/downloads/
├── Elick-macOS.dmg          # macOS应用程序包
├── Elick-Windows.exe        # Windows应用程序
└── README.md               # 说明文件
```

## 使用说明

1. **开发环境**: 将实际的应用程序文件放在这个目录下
2. **生产环境**: 建议使用CDN或云存储服务来托管大文件

## 配置文件

下载链接的配置在 `lib/config/downloads.ts` 中管理：

- 可以配置本地文件路径
- 可以配置CDN链接  
- 可以配置GitHub Releases链接

## 安全注意事项

- 确保下载文件的完整性（建议提供校验和）
- 对大文件使用CDN以提高下载速度
- 实施下载统计和监控 