# Dictionary Evolution 多语言支持文档

## 概述

Dictionary Evolution 组件现在支持不同语言使用不同的示例句子和查询单词，为用户提供更本地化的演示体验。

## 修复的问题

**问题**: 英文版本应该使用 "syzygy" 示例，但代码中硬编码了 "bank" 相关内容，导致所有语言版本都显示相同的示例。

**解决方案**: 将硬编码内容改为动态翻译键，支持不同语言使用不同的示例。

## 语言特定配置

### 中文版本 (messages/zh.json)
```json
{
  "DictionaryEvolution": {
    "bankSentence": "\"I need to go to the bank to deposit my paycheck.\"",
    "wordBank": "bank",
    "common": {
      "bankDefinitionNote": "显示bank的完整词典条目，包含多个含义",
      "dictionaryImage": "/img/bank.png"
    }
  }
}
```

### 英文版本 (messages/en.json)
```json
{
  "DictionaryEvolution": {
    "bankSentence": "\"The syzygy of the planets last night left even seasoned astronomers in awe.\"",
    "wordBank": "syzygy",
    "common": {
      "bankDefinitionNote": "Shows complete dictionary entry for 'syzygy' with multiple meanings",
      "dictionaryImage": "/img/syzygy.png"
    }
  }
}
```

## 技术实现

### 1. 动态单词高亮
**修改前** (硬编码):
```tsx
{t('bankSentence').split('bank').map((part, index, array) => (
  <React.Fragment key={index}>
    {part}
    {index < array.length - 1 && (
      <span className="bg-yellow-200 px-1 rounded font-bold">bank</span>
    )}
  </React.Fragment>
))}
```

**修改后** (动态):
```tsx
{t('bankSentence').split(t('wordBank')).map((part, index, array) => (
  <React.Fragment key={index}>
    {part}
    {index < array.length - 1 && (
      <span className="bg-yellow-200 px-1 rounded font-bold">{t('wordBank')}</span>
    )}
  </React.Fragment>
))}
```

### 2. 动态图片路径
**修改前**:
```tsx
<img src="/img/bank.png" alt={t('common.bankDefinitionNote')} />
```

**修改后**:
```tsx
<img src={t('common.dictionaryImage')} alt={t('common.bankDefinitionNote')} />
```

## 文件结构

```
public/img/
├── bank.png      # 中文版本使用的词典截图
└── syzygy.png    # 英文版本使用的词典截图
```

## 显示效果

### 中文版本
- **示例句子**: "I need to go to the bank to deposit my paycheck."
- **查询单词**: "bank" (高亮显示)
- **词典图片**: bank.png

### 英文版本
- **示例句子**: "The syzygy of the planets last night left even seasoned astronomers in awe."
- **查询单词**: "syzygy" (高亮显示)
- **词典图片**: syzygy.png

## 扩展支持

要为新语言添加支持，请按以下步骤操作：

1. **更新翻译文件**:
   ```json
   {
     "DictionaryEvolution": {
       "bankSentence": "[包含目标单词的示例句子]",
       "wordBank": "[目标单词]",
       "common": {
         "bankDefinitionNote": "[词典条目描述]",
         "dictionaryImage": "/img/[单词].png"
       }
     }
   }
   ```

2. **创建对应的词典截图**:
   ```bash
   # 添加新语言的词典截图
   cp public/img/bank.png public/img/[新单词].png
   ```

3. **替换图片内容**: 将新图片替换为实际的词典查询结果截图

## 维护注意事项

1. **图片同步**: 当更新词典界面时，记得同步更新所有语言版本的截图
2. **单词选择**: 选择的示例单词应该具有教育意义，能够展示词典查询的复杂性
3. **句子质量**: 示例句子应该自然流畅，能够提供足够的语境信息

## 详细修改内容

### 英文版本更新 (messages/en.json)

1. **纸质词典步骤**:
   - "Open dictionary to section B based on first letter of 'bank'" → "Open dictionary to section S based on first letter of 'syzygy'"
   - "Use second letter 'a' to narrow down location" → "Use second letter 'y' to narrow down location"
   - "Locate exact position of 'bank'" → "Locate exact position of 'syzygy'"
   - "Read all meanings of 'bank'" → "Read all meanings of 'syzygy'"

2. **电子词典结果**:
   - "bank (financial institution)" → "syzygy (astronomical alignment)"

3. **ChatGPT 查询示例**:
   - 查询: "Please explain what 'bank' means..." → "Please explain what 'syzygy' means..."
   - 回复: 从银行相关解释更新为天体排列现象解释

### 中文版本保持不变
- 继续使用 "bank" 示例，保持与中文用户的熟悉度

## 测试验证

- [x] 中文版本显示 "bank" 示例
- [x] 英文版本显示 "syzygy" 示例
- [x] 单词高亮功能正常工作
- [x] 图片路径动态加载
- [x] 纸质词典步骤正确显示对应单词
- [x] 电子词典结果显示正确
- [x] ChatGPT 示例查询和回复内容匹配
- [x] 错误回退机制正常
- [x] 代码通过 TypeScript 检查
