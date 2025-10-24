# 多语言 GIF 支持文档

## 概述

Elick Features 组件现在支持根据不同语言显示不同的演示 GIF 图片，为不同语言的用户提供更本地化的体验。

## 文件结构

```
public/gifs/
├── elick-demo.gif      # 原始演示 GIF（保留作为备份）
├── elick-demo-zh.gif   # 中文版演示 GIF
└── elick-demo-en.gif   # 英文版演示 GIF
```

## 翻译配置

### 中文翻译 (messages/zh.json)

```json
{
  "ElickFeatures": {
    "demoGif": "/gifs/elick-demo-zh.gif",
    "demoGifAlt": "Elick 演示",
    "demoGifFallbackTitle": "Elick 演示",
    "demoGifFallbackDescription": "一键智能解释单词",
    "scrollDownText": "向下滚动查看更多",
    "startFreeTrial": "开始免费试用",
    "downloadVersion": "下载版本：",
    "heroSectionTitle": "Elick vs 传统查词方式",
    "heroSectionDescription": "看看 Elick 如何彻底改变查词体验，从繁琐的多步骤操作到一键智能解释",
    "viewMoreFeatures": "查看更多功能"
  }
}
```

### 英文翻译 (messages/en.json)

```json
{
  "ElickFeatures": {
    "demoGif": "/gifs/elick-demo-en.gif",
    "demoGifAlt": "Elick Demo",
    "demoGifFallbackTitle": "Elick Demo",
    "demoGifFallbackDescription": "One-click intelligent word explanation",
    "scrollDownText": "Scroll down for more",
    "startFreeTrial": "Start Free Trial",
    "downloadVersion": "Download version: ",
    "heroSectionTitle": "Elick vs Traditional Word Lookup",
    "heroSectionDescription": "See how Elick revolutionizes word lookup experience, from tedious multi-step operations to one-click intelligent explanations",
    "viewMoreFeatures": "View More Features"
  }
}
```

## 组件实现

ElickFeatures 组件现在使用 `t('demoGif')` 来动态获取对应语言的 GIF 路径：

```tsx
<img
  src={t('demoGif')}
  alt={t('demoGifAlt')}
  className="w-full h-auto object-cover"
  style={{aspectRatio: '4/3', minHeight: '400px'}}
/>
```

## 添加新语言支持

要为新语言添加支持，请按以下步骤操作：

1. **创建语言特定的 GIF 文件**
   ```bash
   cp public/gifs/elick-demo.gif public/gifs/elick-demo-[语言代码].gif
   ```

2. **更新翻译文件**
   在 `messages/[语言代码].json` 中添加：
   ```json
   {
     "ElickFeatures": {
       "demoGif": "/gifs/elick-demo-[语言代码].gif",
       "demoGifAlt": "[语言特定的 Alt 文本]",
       // ... 其他翻译键
     }
   }
   ```

3. **更新路由配置**
   在 `src/i18n/routing.ts` 中添加新的语言代码到 `locales` 数组。

## GIF 制作建议

为了保持一致的用户体验，建议：

1. **尺寸比例**: 保持 4:3 的宽高比
2. **最小高度**: 400px
3. **文件大小**: 控制在合理范围内以确保加载速度
4. **内容本地化**: 
   - 使用对应语言的界面截图
   - 展示本地化的文本内容
   - 考虑文化差异和用户习惯

## 故障排除

### GIF 加载失败

如果 GIF 加载失败，组件会自动显示一个备用界面，包含：
- Elick 图标
- 本地化的标题文本
- 本地化的描述文本

### 文件路径问题

确保：
1. GIF 文件放置在 `public/gifs/` 目录下
2. 翻译文件中的路径以 `/gifs/` 开头
3. 文件名与翻译配置中的路径匹配

## 性能优化

1. **图片优化**: 使用适当的压缩比例减小文件大小
2. **懒加载**: 考虑为 GIF 添加懒加载功能
3. **预加载**: 对于关键的演示 GIF，可以考虑预加载

## 维护注意事项

1. **版本同步**: 当产品界面更新时，记得同步更新所有语言版本的 GIF
2. **质量检查**: 定期检查各语言版本的 GIF 是否正常显示
3. **用户反馈**: 收集不同语言用户对演示内容的反馈，持续优化

## 最新更新 (2025-08-09)

### 完成的多语言支持改进

1. **新增翻译键**:
   - `subtitle`: "查询单词的最佳方案" / "The Ultimate Word Lookup Solution"
   - `mainFeatures.convenient.title`: "更方便：" / "More Convenient:"
   - `mainFeatures.convenient.description`: 便利性功能描述
   - `mainFeatures.faster.title`: "更快：" / "Faster:"
   - `mainFeatures.faster.description`: 速度提升描述
   - `mainFeatures.faster.highlight`: "20-60" / "20-60"
   - `mainFeatures.faster.suffix`: "倍" / "x"
   - `mainFeatures.accurate.title`: "更准确：" / "More Accurate:"
   - `mainFeatures.accurate.description`: 准确性功能描述

2. **修复的硬编码文本**:
   - ✅ "查询单词的最佳方案" → `t('subtitle')`
   - ✅ "更方便：" → `t('mainFeatures.convenient.title')`
   - ✅ "更快：" → `t('mainFeatures.faster.title')`
   - ✅ "更准确：" → `t('mainFeatures.accurate.title')`
   - ✅ 所有功能描述文本
   - ✅ 标点符号处理 (中文句号/英文句号)

3. **完全移除的硬编码判断**:
   - 移除了所有 `locale === 'zh' ? '中文' : 'English'` 的条件判断
   - 所有文本现在都通过翻译系统统一管理

4. **强调文本样式修复** (2025-08-09 更新):
   - ✅ "更方便" 中强调 "任意区域" / "any area"
   - ✅ "更准确" 中强调 "当前语境" / "current context" 和 "最准确的含义" / "most accurate meaning"
   - ✅ 使用 `underline font-semibold` 样式实现强调效果
   - ✅ 翻译文件结构支持分段文本和强调文本
   - ✅ 修复英文版本中强调文本前后的空格问题

5. **GIF 显示比例优化** (2025-08-09 更新):
   - ✅ 移除固定的 `aspectRatio: '4/3'` 限制
   - ✅ 改用 `object-contain` 保持 GIF 原始比例
   - ✅ 设置 `minHeight: '400px', maxHeight: '600px'` 控制显示范围
   - ✅ 支持 4:3、16:9 等各种比例的 GIF 完整显示

### 强调文本实现方式

```tsx
// 更方便 - 强调"任意区域"
<span className="text-lg text-gray-600 ml-1">
  {t('mainFeatures.convenient.description')}
  <span className="underline font-semibold">{t('mainFeatures.convenient.highlight')}</span>
  {t('mainFeatures.convenient.descriptionEnd')}
</span>

// 更准确 - 强调"当前语境"和"最准确的含义"
<span className="text-lg text-gray-600 ml-1">
  {t('mainFeatures.accurate.description')}
  <span className="underline font-semibold">{t('mainFeatures.accurate.highlight1')}</span>
  {t('mainFeatures.accurate.descriptionMiddle')}
  <span className="underline font-semibold">{t('mainFeatures.accurate.highlight2')}</span>
  {t('mainFeatures.accurate.descriptionEnd')}
</span>
```

### 验证清单

- [x] 所有用户可见文本都使用翻译键
- [x] 中英文翻译文件都包含完整的翻译
- [x] 组件中没有硬编码的中文文本
- [x] GIF 文件根据语言动态加载
- [x] 标点符号正确本地化
- [x] 强调文本样式正确显示
- [x] 多语言强调文本支持
- [x] GIF 显示比例自适应 (支持 4:3, 16:9 等不同比例)
- [x] 代码通过 TypeScript 检查
