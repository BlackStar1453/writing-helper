# Actions 管理系统使用指南

## 概述

Actions 管理系统提供了完整的内置和自定义 Actions 管理功能，支持通过 JSON 文件批量导入和单独的 CRUD 操作。

## 功能特性

### ✅ 已实现的功能

1. **JSON 文件批量导入**
   - 支持上传 JSON 格式的 Actions 文件
   - 文件格式验证和预览
   - 多语言支持
   - 提供模板和示例文件下载

2. **单独 CRUD 操作**
   - ✅ 创建新的 Action
   - ✅ 编辑现有 Action
   - ✅ 删除单个或批量删除 Actions
   - ✅ 查看 Actions 列表和详情

3. **高级功能**
   - ✅ 搜索和过滤
   - ✅ 分组管理
   - ✅ 收藏标记
   - ✅ 批量选择和操作
   - ✅ 权限控制（仅管理员可访问）

## 访问方式

1. 以管理员身份登录系统
2. 访问 Dashboard: `http://localhost:3000/dashboard/admin/actions`
3. 或通过导航菜单：Dashboard → Actions Management

## 使用指南

### 1. 查看 Actions 列表

在 "Actions 列表" 标签页中：
- 查看所有 Actions 的列表
- 使用搜索框按名称或命令搜索
- 按分组过滤 Actions
- 切换显示内置或自定义 Actions

### 2. 创建新的 Action

**方法一：单独创建**
1. 点击 "新建 Action" 按钮
2. 填写 Action 信息：
   - **基本信息**：名称、分组、图标
   - **提示词设置**：角色提示词、命令提示词
   - **高级设置**：模式、推荐模型、输出格式等
3. 点击 "创建" 保存

**方法二：JSON 文件导入**
1. 切换到 "批量导入" 标签页
2. 下载模板文件或示例文件
3. 编辑 JSON 文件，添加您的 Actions
4. 上传文件并预览
5. 点击 "导入 Actions" 完成导入

### 3. 编辑 Action

1. 在 Actions 列表中找到要编辑的 Action
2. 点击操作菜单中的 "编辑" 按钮
3. 修改 Action 信息
4. 点击 "保存" 更新

### 4. 删除 Actions

**单个删除：**
1. 点击 Action 操作菜单中的 "删除"
2. 确认删除操作

**批量删除：**
1. 勾选要删除的 Actions
2. 点击 "删除选中" 按钮
3. 确认批量删除操作

### 5. 管理收藏

- 点击星形图标可以标记/取消标记 Action 为常用
- 常用 Actions 会在列表中优先显示

## JSON 文件格式

### 基本结构

```json
{
  "language": "zh-Hans",
  "version": "1.0.0",
  "description": "Actions 描述",
  "actions": [
    {
      "name": "Action 名称",
      "groups": ["分组1", "分组2"],
      "icon": "MdIcon",
      "rolePrompt": "角色提示词",
      "commandPrompt": "命令提示词，可使用变量 \"${selectedText}\"",
      "mode": "custom",
      "model": "gpt-4",
      "outputRenderingFormat": "text",
      "useBackgroundInfo": false,
      "useLanguageLevelInfo": false
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | Action 名称 |
| `groups` | string[] | ✅ | 分组列表，至少一个 |
| `icon` | string | ❌ | 图标名称 |
| `rolePrompt` | string | ❌ | 角色提示词 |
| `commandPrompt` | string | ❌ | 命令提示词 |
| `mode` | string | ❌ | 模式：translate, summary, explain, rewrite, grammar_check, custom |
| `model` | string | ❌ | 推荐的 AI 模型 |
| `outputRenderingFormat` | string | ❌ | 输出格式：text, markdown, html, json |
| `useBackgroundInfo` | boolean | ❌ | 是否使用背景信息 |
| `useLanguageLevelInfo` | boolean | ❌ | 是否使用语言级别信息 |

### 可用变量

在 `commandPrompt` 中可以使用以下变量：
- `${selectedText}` - 用户选中的文本
- `${selectedWord}` - 用户选中的单词
- `${targetLanguage}` - 目标语言

## 模板文件

系统提供了三个模板文件：

1. **空白模板** (`actions-template.json`)
   - 基本的 JSON 结构
   - 包含一个示例 Action

2. **英文示例** (`actions-example-en.json`)
   - 5个英文 Actions 示例
   - 涵盖商务、编程、写作等场景

3. **中文示例** (`actions-example-zh.json`)
   - 7个中文 Actions 示例
   - 包含更多本地化场景

## API 端点

系统提供了完整的 REST API：

- `GET /api/admin/actions` - 获取 Actions 列表
- `POST /api/admin/actions` - 创建单个 Action
- `POST /api/admin/actions?batch=true` - 批量导入 Actions
- `GET /api/admin/actions/{id}` - 获取单个 Action
- `PUT /api/admin/actions/{id}` - 更新 Action
- `DELETE /api/admin/actions/{id}` - 删除 Action

## 权限控制

- 只有管理员可以访问 Actions 管理功能
- 普通用户无法查看或修改 Actions
- 系统会自动验证用户权限

## 数据安全

- 所有操作都有完整的错误处理
- JSON 文件上传前会进行格式验证
- 数据库操作使用事务确保一致性
- 支持批量操作的回滚

## 故障排除

### 常见问题

1. **上传文件失败**
   - 检查文件格式是否为 JSON
   - 验证 JSON 语法是否正确
   - 确保包含必需字段

2. **权限错误**
   - 确认已以管理员身份登录
   - 检查用户角色设置

3. **创建/编辑失败**
   - 检查必填字段是否完整
   - 确认分组不为空
   - 验证字段长度限制

### 调试工具

可以使用提供的测试脚本进行调试：

```bash
# 测试 Actions 管理功能
npx tsx scripts/test-actions-management.ts

# 测试 CRUD 操作（需要服务器运行）
TEST_API=true npx tsx scripts/test-actions-crud.ts
```

## 最佳实践

1. **命名规范**
   - 使用清晰、描述性的 Action 名称
   - 分组名称保持一致性

2. **提示词设计**
   - 角色提示词要明确定义 AI 的专业背景
   - 命令提示词要具体、可操作
   - 合理使用变量提高灵活性

3. **分组管理**
   - 按功能或场景进行分组
   - 避免过多的分组层级

4. **版本管理**
   - 定期备份 Actions 配置
   - 使用版本号管理 JSON 文件

## 更新日志

### v1.0.0 (当前版本)
- ✅ 完整的 CRUD 功能
- ✅ JSON 文件批量导入
- ✅ 搜索和过滤功能
- ✅ 批量操作支持
- ✅ 权限控制
- ✅ 多语言支持

### 计划功能
- 📋 Actions 导出功能
- 📋 使用统计和分析
- 📋 Actions 模板市场
- 📋 版本历史管理

---

如有问题或建议，请联系系统管理员。
