# 内置 Actions 服务器端实现文档

## 概述

本文档描述了基于客户端需求实现的服务器端内置 Actions 管理和使用系统。该系统提供了完整的内置 actions 管理功能，包括多语言支持、缓存机制和版本管理。

## 系统架构

### 1. 数据库模型

#### Actions 表 (`actions`)
```sql
CREATE TABLE actions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL 表示内置 action
  idx INTEGER NOT NULL,
  mode VARCHAR(50), -- ContextMode
  name VARCHAR(255) NOT NULL,
  model VARCHAR(100),
  groups TEXT NOT NULL, -- JSON 数组
  icon VARCHAR(100),
  role_prompt TEXT,
  command_prompt TEXT,
  output_rendering_format VARCHAR(50),
  parent_ids TEXT, -- JSON 数组
  children_ids TEXT, -- JSON 数组
  use_background_info BOOLEAN DEFAULT FALSE,
  use_language_level_info BOOLEAN DEFAULT FALSE,
  is_frequently_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Action Groups 表 (`action_groups`)
```sql
CREATE TABLE action_groups (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  price INTEGER DEFAULT 0,
  version VARCHAR(50) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. TypeScript 类型定义

#### 核心接口
```typescript
// 客户端 Action 接口（与客户端保持一致）
export interface ClientAction {
  userId?: string;
  id?: number;
  idx: number;
  mode?: ContextMode;
  name: string;
  model?: string;
  groups: string[];
  icon?: string;
  rolePrompt?: string;
  commandPrompt?: string;
  outputRenderingFormat?: ActionOutputRenderingFormat;
  updatedAt: string;
  createdAt: string;
  parentIds?: number[];
  childrenIds?: number[];
  useBackgroundInfo?: boolean;
  useLanguageLevelInfo?: boolean;
  isFrequentlyUsed?: boolean;
}

// 枚举类型
export enum ContextMode {
  TRANSLATE = 'translate',
  SUMMARY = 'summary', 
  EXPLAIN = 'explain',
  REWRITE = 'rewrite',
  GRAMMAR_CHECK = 'grammar_check',
  CUSTOM = 'custom'
}

export enum ActionOutputRenderingFormat {
  TEXT = 'text',
  MARKDOWN = 'markdown',
  HTML = 'html',
  JSON = 'json'
}
```

### 3. 内置 Actions 数据

系统预定义了 8 个内置 actions：

1. **Explain in Context** - 上下文解释
2. **Translate** - 翻译
3. **Summarize** - 总结
4. **Grammar Check** - 语法检查
5. **Rewrite** - 重写
6. **Define Word** - 词语定义
7. **Code Explain** - 代码解释
8. **Email Reply** - 邮件回复

每个 action 都支持多语言（英文、简体中文、繁体中文）。

## API 端点

### 1. 获取内置 Actions

**端点**: `GET /api/builtin-actions`

**查询参数**:
- `language` (可选): 语言代码，默认为 'en'

**响应格式**:
```json
{
  "success": true,
  "data": {
    "actions": [
      {
        "id": -1,
        "idx": -1,
        "name": "Explain in Context",
        "groups": ["Built-in"],
        "icon": "MdQuestionAnswer",
        "commandPrompt": "Please explain the meaning of the selected word \"${selectedWord}\" in the given context.",
        "isFrequentlyUsed": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "version": "1.0.0",
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. 获取版本信息

**端点**: `GET /api/builtin-actions/version`

**查询参数**:
- `language` (可选): 语言代码，默认为 'en'

**响应格式**:
```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

## 功能特性

### 1. 多语言支持

系统支持以下语言：
- `en`: 英文
- `zh-Hans`: 简体中文
- `zh-Hant`: 繁体中文

### 2. 缓存机制

- **内存缓存**: 30分钟 TTL
- **HTTP 缓存**: 
  - Actions API: 30分钟缓存
  - Version API: 1小时缓存
- **预热功能**: 支持预加载所有语言的数据

### 3. 版本管理

- 版本号管理
- 最后更新时间跟踪
- 客户端缓存失效机制

## 使用示例

### 1. 基本使用

```typescript
import { getBuiltinActions } from '@/lib/builtin-actions/manager';

// 获取英文版本的内置 actions
const enActions = await getBuiltinActions('en');

// 获取中文版本的内置 actions
const zhActions = await getBuiltinActions('zh-Hans');
```

### 2. 客户端集成

```typescript
// 在客户端使用 fetch 获取
const response = await fetch('/api/builtin-actions?language=zh-Hans');
const data = await response.json();

if (data.success) {
  const actions = data.data.actions;
  // 使用 actions...
}
```

### 3. 版本检查

```typescript
import { getBuiltinActionsVersion, hasNewVersion } from '@/lib/builtin-actions/manager';

// 获取版本信息
const versionInfo = await getBuiltinActionsVersion('en');

// 检查是否有新版本
const isNewVersion = await hasNewVersion('0.9.0', 'en');
```

## 测试

系统包含完整的测试套件：

```bash
# 测试管理器功能
npx tsx scripts/test-builtin-actions.ts

# 测试 API 端点（需要服务器运行）
TEST_API_ENDPOINTS=true npx tsx scripts/test-builtin-actions.ts
```

## 部署和维护

### 1. 数据库迁移

```bash
# 应用数据库迁移
npx drizzle-kit push
```

### 2. 缓存管理

```typescript
import { clearBuiltinActionsCache, preloadBuiltinActions } from '@/lib/builtin-actions/manager';

// 清除缓存
clearBuiltinActionsCache();

// 预热缓存
await preloadBuiltinActions();
```

### 3. 监控和日志

系统包含详细的错误处理和日志记录，便于监控和调试。

## 扩展性

系统设计具有良好的扩展性：

1. **新增语言**: 在 `TRANSLATIONS` 对象中添加新的语言支持
2. **新增 Actions**: 在 `BUILTIN_ACTIONS` 数组中添加新的 action 配置
3. **自定义缓存**: 可以轻松替换缓存实现
4. **数据库存储**: 支持将内置 actions 存储到数据库中

## 安全性

- CORS 配置
- 输入验证
- 错误处理
- 缓存安全

这个实现完全符合客户端的需求，提供了完整的内置 actions 管理和使用功能。
