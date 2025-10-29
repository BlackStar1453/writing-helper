# 版本可用性预设配置指南

## 概述

为了提升用户体验，避免版本检测延迟，我们实现了版本可用性预设配置。开发者可以在确认版本发布后，直接设置版本为可用状态，让用户立即看到下载按钮，无需等待版本检测完成。

**保留的检测功能：**
- ✅ 网络环境检测（自动选择OSS或CDN）
- ✅ 平台检测（自动识别Mac/Windows及架构）

**优化的功能：**
- ⚡ 版本可用性检测（直接使用预设值）

## 配置文件位置

主配置文件：`lib/config/preset-config.ts`

## 快速配置

### 版本可用性配置（主要优化项）

```typescript
version: {
  enableCheck: false,    // 禁用检查，直接使用预设值
  availability: {
    windows: true,        // Windows 版本是否可用
    macIntel: true,       // Mac Intel 版本是否可用
    macAppleSilicon: true // Mac Apple Silicon 版本是否可用
  }
}
```

**推荐设置：**
- 版本发布后，将对应平台设置为 `true`
- 未发布的平台设置为 `false`

## 常见场景配置

### 场景1：海外用户为主，开发团队使用 Mac

```typescript
export const PRESET_CONFIG = {
  network: {
    enableDetection: false,
    isChina: false  // 使用海外CDN
  },
  platform: {
    enableDetection: false,
    type: 'mac',
    macArchitecture: 'aarch64'  // Apple Silicon
  },
  version: {
    enableCheck: false,
    availability: {
      windows: true,
      macIntel: true,
      macAppleSilicon: true
    }
  }
};
```

### 场景2：中国大陆用户为主

```typescript
export const PRESET_CONFIG = {
  network: {
    enableDetection: false,
    isChina: true  // 使用阿里云OSS
  },
  platform: {
    enableDetection: false,
    type: 'windows'  // 大部分中国用户使用Windows
  },
  version: {
    enableCheck: false,
    availability: {
      windows: true,
      macIntel: true,
      macAppleSilicon: true
    }
  }
};
```

## 恢复检测功能

如果需要恢复实际检测功能，只需将对应的 `enable*` 设置为 `true`：

```typescript
network: {
  enableDetection: true,  // 恢复网络检测
  // ...
},
platform: {
  enableDetection: true,  // 恢复平台检测
  // ...
},
version: {
  enableCheck: true,      // 恢复版本检查
  // ...
}
```

## 调试信息

系统会在浏览器控制台输出当前配置信息，格式如下：

```
🔧 [PRESET_CONFIG] 当前配置:
   网络: 海外CDN (检测禁用)
   平台: mac(aarch64) (检测禁用)
   版本: Windows:true, Intel:true, Silicon:true (检查禁用)
```

## 注意事项

1. **版本发布后及时更新**：每次发布新版本后，请检查并更新 `version.availability` 配置
2. **根据用户群体调整**：根据实际用户分布调整网络和平台预设
3. **测试不同配置**：建议在不同配置下测试用户体验
4. **保留检测功能**：在需要时可以随时恢复检测功能

## 相关文件

- `lib/config/preset-config.ts` - 主配置文件
- `hooks/useNetworkDetection.ts` - 网络检测Hook
- `lib/services/version-service.ts` - 版本检查服务
- `lib/config/downloads.ts` - 平台检测逻辑
- `components/elick-features.tsx` - 主要使用组件
