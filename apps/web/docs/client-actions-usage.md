# 客户端 Actions 使用指南

## 概述

本文档介绍如何在客户端应用中获取和使用 Actions，包括内置 Actions 和用户自定义 Actions。

## API 端点

### 1. 获取内置 Actions

**端点**: `GET /api/builtin-actions`

**查询参数**:
- `language` (可选): 语言代码，默认为 'en'
  - 支持的语言: `en`, `zh-Hans`, `zh-Hant`

**请求示例**:
```javascript
// 获取英文版本的内置 Actions
const response = await fetch('/api/builtin-actions?language=en');
const data = await response.json();

// 获取中文版本的内置 Actions
const zhResponse = await fetch('/api/builtin-actions?language=zh-Hans');
const zhData = await zhResponse.json();
```

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

**请求示例**:
```javascript
const response = await fetch('/api/builtin-actions/version?language=en');
const versionData = await response.json();
```

**响应格式**:
```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

## React Hook 使用方式

### 1. 基本使用

```typescript
import { useBuiltinActions } from '@/common/hooks/useBuiltinActions';
import { useSettings } from '@/common/hooks/useSettings';

const MyComponent: React.FC = () => {
  const { settings } = useSettings();
  const language = settings?.i18n || 'en';
  
  const {
    actions,
    isLoading,
    error,
    refreshActions,
    forceRefreshFromServer
  } = useBuiltinActions(language);
  
  if (isLoading) {
    return <div>Loading actions...</div>;
  }
  
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  
  return (
    <div>
      <h3>Available Actions ({actions.length})</h3>
      {actions.map(action => (
        <div key={action.id} className="action-item">
          <span className="icon">{action.icon}</span>
          <span className="name">{action.name}</span>
          <div className="groups">
            {action.groups.map(group => (
              <span key={group} className="group-tag">{group}</span>
            ))}
          </div>
        </div>
      ))}
      
      <button onClick={refreshActions}>Refresh</button>
      <button onClick={forceRefreshFromServer}>Force Refresh</button>
    </div>
  );
};
```

### 2. 与 Zustand Store 集成

```typescript
import { useEffect } from 'react';
import { useBuiltinActions } from '@/common/hooks/useBuiltinActions';
import { useChatStore } from '@/store/file/store';

const ActionManager: React.FC = () => {
  const { settings } = useSettings();
  const language = settings?.i18n || 'en';
  
  const { actions: builtinActions } = useBuiltinActions(language);
  const { setBuiltinActions } = useChatStore();
  
  // 当内置 actions 更新时，同步到 store
  useEffect(() => {
    if (builtinActions && builtinActions.length > 0) {
      setBuiltinActions(builtinActions);
    }
  }, [builtinActions, setBuiltinActions]);
  
  return null; // 这是一个数据管理组件，不需要渲染 UI
};
```

### 3. 预加载和缓存管理

```typescript
import { usePreloadBuiltinActions, clearBuiltinActionsCache } from '@/common/hooks/useBuiltinActions';

const AppInitializer: React.FC = () => {
  const { preload } = usePreloadBuiltinActions('en');
  
  useEffect(() => {
    // 在应用启动时预加载 actions
    preload();
  }, [preload]);
  
  // 清除缓存的方法
  const handleClearCache = () => {
    clearBuiltinActionsCache();
  };
  
  return (
    <div>
      <button onClick={handleClearCache}>Clear Cache</button>
    </div>
  );
};
```

## Action 数据结构

### Action 接口定义

```typescript
interface Action {
  userId?: string;           // 用户ID，null表示内置Action
  id?: number;              // Action ID，负数表示内置Action
  idx: number;              // 排序索引
  mode?: ContextMode;       // 上下文模式
  name: string;             // Action名称
  model?: string;           // 推荐的AI模型
  groups: string[];         // 分组列表
  icon?: string;            // 图标名称
  rolePrompt?: string;      // 角色提示词
  commandPrompt?: string;   // 命令提示词
  outputRenderingFormat?: ActionOutputRenderingFormat; // 输出格式
  updatedAt: string;        // 更新时间
  createdAt: string;        // 创建时间
  parentIds?: number[];     // 父级Action IDs
  childrenIds?: number[];   // 子级Action IDs
  useBackgroundInfo?: boolean;      // 是否使用背景信息
  useLanguageLevelInfo?: boolean;   // 是否使用语言级别信息
  isFrequentlyUsed?: boolean;       // 是否为常用Action
}
```

### 枚举类型

```typescript
enum ContextMode {
  TRANSLATE = 'translate',
  SUMMARY = 'summary',
  EXPLAIN = 'explain',
  REWRITE = 'rewrite',
  GRAMMAR_CHECK = 'grammar_check',
  CUSTOM = 'custom'
}

enum ActionOutputRenderingFormat {
  TEXT = 'text',
  MARKDOWN = 'markdown',
  HTML = 'html',
  JSON = 'json'
}
```

## 实际使用场景

### 1. 文本处理应用

```typescript
const TextProcessor: React.FC = () => {
  const [selectedText, setSelectedText] = useState('');
  const { actions } = useBuiltinActions('en');
  
  const handleActionClick = (action: Action) => {
    if (action.commandPrompt && selectedText) {
      // 替换变量
      const processedPrompt = action.commandPrompt
        .replace('${selectedText}', selectedText)
        .replace('${selectedWord}', selectedText.split(' ')[0]);
      
      // 发送到AI处理
      processText(processedPrompt, action);
    }
  };
  
  const processText = async (prompt: string, action: Action) => {
    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: action.model,
          outputFormat: action.outputRenderingFormat,
          useBackground: action.useBackgroundInfo
        })
      });
      
      const result = await response.json();
      // 处理结果...
    } catch (error) {
      console.error('处理失败:', error);
    }
  };
  
  return (
    <div>
      <textarea
        value={selectedText}
        onChange={(e) => setSelectedText(e.target.value)}
        placeholder="输入要处理的文本..."
      />
      
      <div className="actions-grid">
        {actions.map(action => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className="action-button"
            disabled={!selectedText}
          >
            <span className="icon">{action.icon}</span>
            <span className="name">{action.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
```

### 2. 上下文菜单集成

```typescript
const ContextMenu: React.FC<{ selectedText: string; position: { x: number; y: number } }> = ({
  selectedText,
  position
}) => {
  const { actions } = useBuiltinActions('en');
  
  // 过滤适用的actions
  const applicableActions = actions.filter(action => {
    if (!selectedText) return false;
    
    // 根据选中文本类型过滤actions
    if (selectedText.split(' ').length === 1) {
      // 单词 - 显示解释、定义等actions
      return action.groups.includes('Word') || action.name.includes('Define');
    } else {
      // 句子/段落 - 显示翻译、总结等actions
      return action.groups.includes('Text') || action.mode === 'translate';
    }
  });
  
  return (
    <div 
      className="context-menu"
      style={{ left: position.x, top: position.y }}
    >
      {applicableActions.map(action => (
        <div
          key={action.id}
          className="context-menu-item"
          onClick={() => handleActionClick(action)}
        >
          <span className="icon">{action.icon}</span>
          <span className="name">{action.name}</span>
        </div>
      ))}
    </div>
  );
};
```

### 3. 智能推荐

```typescript
const ActionRecommender: React.FC = () => {
  const { actions } = useBuiltinActions('en');
  const [context, setContext] = useState('');
  
  // 根据上下文推荐actions
  const getRecommendedActions = (text: string) => {
    const words = text.toLowerCase().split(' ');
    
    return actions.filter(action => {
      // 基于关键词匹配
      if (words.some(word => ['code', 'function', 'class'].includes(word))) {
        return action.groups.includes('Programming');
      }
      
      if (words.some(word => ['email', 'letter', 'message'].includes(word))) {
        return action.groups.includes('Communication');
      }
      
      if (words.some(word => ['translate', '翻译'].includes(word))) {
        return action.mode === 'translate';
      }
      
      return action.isFrequentlyUsed;
    }).slice(0, 5); // 限制推荐数量
  };
  
  const recommendedActions = getRecommendedActions(context);
  
  return (
    <div>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder="输入内容，获取智能推荐..."
      />
      
      {recommendedActions.length > 0 && (
        <div className="recommendations">
          <h4>推荐的Actions:</h4>
          {recommendedActions.map(action => (
            <div key={action.id} className="recommendation-item">
              <span className="icon">{action.icon}</span>
              <span className="name">{action.name}</span>
              <span className="description">{action.commandPrompt?.substring(0, 50)}...</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 错误处理

### 1. 网络错误处理

```typescript
const { actions, error, isLoading } = useBuiltinActions('en');

if (error) {
  // 根据错误类型显示不同的提示
  if (error.message.includes('network')) {
    return <div>网络连接失败，请检查网络设置</div>;
  }
  
  if (error.message.includes('unauthorized')) {
    return <div>权限不足，请重新登录</div>;
  }
  
  return <div>加载失败: {error.message}</div>;
}
```

### 2. 降级处理

```typescript
const ActionsList: React.FC = () => {
  const { actions, error } = useBuiltinActions('en', true); // 启用本地回退
  
  return (
    <div>
      {error && (
        <div className="warning">
          无法从服务器获取最新Actions，正在使用本地版本
        </div>
      )}
      
      {actions.map(action => (
        <ActionItem key={action.id} action={action} />
      ))}
    </div>
  );
};
```

## 性能优化

### 1. 缓存策略

- Actions数据自动缓存30分钟
- 支持手动刷新和强制刷新
- 语言切换时自动获取对应语言的Actions

### 2. 预加载

```typescript
// 在应用启动时预加载常用语言的Actions
const preloadLanguages = ['en', 'zh-Hans', 'zh-Hant'];
preloadLanguages.forEach(lang => {
  preloadBuiltinActions(lang);
});
```

### 3. 按需加载

```typescript
// 只在需要时加载特定分组的Actions
const getActionsByGroup = (group: string) => {
  return actions.filter(action => action.groups.includes(group));
};
```

## 最佳实践

1. **缓存管理**: 合理使用缓存，避免频繁请求
2. **错误处理**: 提供友好的错误提示和降级方案
3. **性能优化**: 使用预加载和按需加载策略
4. **用户体验**: 提供加载状态和操作反馈
5. **国际化**: 根据用户语言设置获取对应的Actions

## 调试工具

```typescript
// 开发环境下的调试信息
if (process.env.NODE_ENV === 'development') {
  console.log('Available actions:', actions);
  console.log('Cache status:', getCacheStatus());
  console.log('Supported languages:', getSupportedLanguages());
}
```

---

通过以上方式，你可以在客户端应用中灵活地获取和使用Actions，为用户提供丰富的文本处理和AI交互功能。
