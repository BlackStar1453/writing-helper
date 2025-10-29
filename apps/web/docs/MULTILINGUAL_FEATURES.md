# 多语言功能路线图系统

本文档介绍如何使用和管理功能路线图的多语言支持系统。

## 🌍 支持的语言

目前系统支持以下语言：

| 语言代码 | 语言名称 | 状态 |
|---------|---------|------|
| `en` | English | ✅ 原始语言 |
| `zh` | 中文 | ✅ 支持 |
| `ja` | 日本語 | ✅ 支持 |
| `ko` | 한국어 | ✅ 支持 |
| `fr` | Français | ✅ 支持 |
| `de` | Deutsch | ✅ 支持 |
| `es` | Español | ✅ 支持 |
| `pt` | Português | ✅ 支持 |
| `ru` | Русский | ✅ 支持 |
| `ar` | العربية | ✅ 支持 |
| `hi` | हिन्दी | ✅ 支持 |

## 📋 系统架构

### 数据库设计

```sql
-- 功能表（原始英文内容）
features (
  id UUID PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  status VARCHAR(20),
  priority INTEGER,
  ...
)

-- 翻译表
feature_translations (
  id UUID PRIMARY KEY,
  feature_id UUID REFERENCES features(id),
  locale VARCHAR(10),
  title VARCHAR(200),
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(feature_id, locale)
)
```

### API设计

- `GET /api/features?locale=zh` - 获取指定语言的功能列表
- `GET /api/admin/features/{id}/translations` - 获取功能的所有翻译
- `POST /api/admin/features/{id}/translations` - 创建/更新翻译
- `DELETE /api/admin/features/{id}/translations?locale=zh` - 删除翻译

## 🚀 快速开始

### 1. 创建数据表

```bash
# 使用提供的脚本
./scripts/run-translations.sh --create-tables

# 或手动执行SQL
psql -d your_database -f scripts/create-translation-tables.sql
```

### 2. 查看现有功能

```bash
# 列出所有功能
npx tsx scripts/list-features.ts

# 或使用便捷脚本
./scripts/run-translations.sh --list-features
```

### 3. 生成翻译

#### 为所有功能生成翻译

```bash
# 生成中文、日文、韩文翻译
npx tsx scripts/generate-feature-translations.ts --all --locale zh,ja,ko

# 使用便捷脚本
./scripts/run-translations.sh --translate-all zh,ja,ko
```

#### 为特定功能生成翻译

```bash
# 为指定功能ID生成中文翻译
npx tsx scripts/generate-feature-translations.ts --feature-id abc123 --locale zh

# 使用便捷脚本
./scripts/run-translations.sh --translate-feature abc123 zh
```

## 🔧 配置翻译服务

### OpenAI API（推荐）

1. 获取OpenAI API密钥
2. 设置环境变量：

```bash
export OPENAI_API_KEY="your-api-key-here"
```

3. 运行翻译脚本，系统会自动使用OpenAI进行翻译

### 自定义翻译服务

修改 `scripts/generate-feature-translations.ts` 中的 `translateContent` 函数：

```typescript
async function translateContent(locale: SupportedLocale, title: string, description: string) {
  // 接入你的翻译服务
  const result = await yourTranslationService.translate({
    text: `${title}\n${description}`,
    targetLanguage: locale
  });
  
  return {
    title: result.translatedTitle,
    description: result.translatedDescription
  };
}
```

## 🎯 用户界面

### 用户端功能

- **自动语言检测**: 根据用户的语言设置显示对应翻译
- **回退机制**: 如果翻译不存在，自动显示英文原版
- **语言指示器**: 显示当前内容的语言状态

### 管理员功能

- **翻译管理界面**: 在管理员面板中管理所有翻译
- **批量翻译**: 支持批量生成多语言翻译
- **翻译编辑**: 手动编辑和优化翻译内容
- **翻译删除**: 删除不需要的翻译

## 📱 前端集成

### 获取多语言功能列表

```typescript
// 在React组件中
const locale = useLocale(); // 获取当前语言

useEffect(() => {
  const fetchFeatures = async () => {
    const response = await fetch(`/api/features?locale=${locale}`);
    const data = await response.json();
    setFeatures(data.data);
  };
  
  fetchFeatures();
}, [locale]);
```

### 显示语言状态

```typescript
function FeatureCard({ feature }) {
  return (
    <div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
      
      {/* 语言指示器 */}
      {feature.fallbackUsed && (
        <Badge>EN (原文)</Badge>
      )}
      {feature.isTranslated && (
        <Badge>{feature.locale.toUpperCase()}</Badge>
      )}
    </div>
  );
}
```

## 🔍 故障排除

### 常见问题

1. **翻译不显示**
   - 检查数据库连接
   - 确认翻译表已创建
   - 验证语言代码是否正确

2. **OpenAI翻译失败**
   - 检查API密钥是否正确
   - 确认网络连接
   - 查看API配额是否充足

3. **翻译质量问题**
   - 使用管理员界面手动编辑翻译
   - 调整翻译提示词
   - 考虑使用专业翻译服务

### 调试命令

```bash
# 检查数据库连接
npx tsx scripts/list-features.ts

# 测试翻译API
OPENAI_API_KEY=your-key npx tsx scripts/generate-feature-translations.ts --feature-id test --locale zh

# 查看翻译日志
tail -f logs/translation.log
```

## 🚀 部署注意事项

1. **环境变量**: 确保生产环境设置了必要的API密钥
2. **数据库迁移**: 在部署前运行数据库迁移脚本
3. **缓存策略**: 考虑为翻译内容添加缓存
4. **监控**: 设置翻译API调用的监控和告警

## 📈 性能优化

1. **数据库索引**: 已为常用查询创建索引
2. **API缓存**: 考虑使用Redis缓存翻译结果
3. **批量操作**: 使用批量API减少数据库查询
4. **CDN**: 静态翻译内容可以使用CDN加速

## 🤝 贡献指南

1. 添加新语言支持：
   - 在 `SUPPORTED_LOCALES` 中添加语言配置
   - 更新翻译脚本
   - 添加相应的测试

2. 改进翻译质量：
   - 优化翻译提示词
   - 添加术语词典
   - 实现翻译质量评估

3. 扩展功能：
   - 支持更多翻译服务
   - 添加翻译审核流程
   - 实现翻译版本管理

## 📞 支持

如有问题或建议，请：

1. 查看本文档的故障排除部分
2. 检查GitHub Issues
3. 联系开发团队

---

**注意**: 本系统设计为可扩展的多语言解决方案，可以根据实际需求进行定制和扩展。
