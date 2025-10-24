/**
 * Action 和 ActionGroup 相关的类型定义
 * 基于客户端接口定义，用于服务器端的类型安全
 */

// 上下文模式枚举
export enum ContextMode {
  TRANSLATE = 'translate',
  SUMMARY = 'summary', 
  EXPLAIN = 'explain',
  REWRITE = 'rewrite',
  GRAMMAR_CHECK = 'grammar_check',
  CUSTOM = 'custom'
}

// Action 输出渲染格式枚举
export enum ActionOutputRenderingFormat {
  TEXT = 'text',
  MARKDOWN = 'markdown',
  HTML = 'html',
  JSON = 'json'
}

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
  language?: string; // 语言代码
}

// 客户端 ActionGroup 接口（与客户端保持一致）
export interface ClientActionGroup {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  version: string;
  actions: ClientAction[];
}

// 服务器端扩展的 Action 类型
export interface ServerAction extends ClientAction {
  language?: string; // 语言代码
  isBuiltin?: boolean; // 是否为内置 action
  createdBy?: string; // 创建者 ID
}

// 服务器端扩展的 ActionGroup 类型
export interface ServerActionGroup extends ClientActionGroup {
  language?: string; // 语言代码
  createdAt?: string;
  updatedAt?: string;
}

// API 响应类型
export interface BuiltinActionsResponse {
  success: boolean;
  data: {
    actions: ClientAction[];
    version: string;
    lastUpdated: string;
  };
  error?: string;
}

export interface BuiltinActionsVersionResponse {
  version: string;
  lastUpdated: string;
}

// 内置 Actions 配置类型
export interface BuiltinActionConfig {
  id: number;
  idx: number;
  name: string;
  nameKey: string; // 用于国际化的 key
  groups: string[];
  icon?: string;
  rolePrompt?: string;
  rolePromptKey?: string; // 用于国际化的 key
  commandPrompt?: string;
  commandPromptKey?: string; // 用于国际化的 key
  outputRenderingFormat?: ActionOutputRenderingFormat;
  useBackgroundInfo?: boolean;
  useLanguageLevelInfo?: boolean;
  isFrequentlyUsed?: boolean;
}

// 多语言内置 Actions 数据结构
export interface LocalizedBuiltinActions {
  version: string;
  lastUpdated: string;
  actions: BuiltinActionConfig[];
  translations: {
    [language: string]: {
      [key: string]: string;
    };
  };
}

// Action 创建/更新请求类型
export interface CreateActionRequest {
  name: string;
  groups: string[];
  icon?: string;
  rolePrompt?: string;
  commandPrompt?: string;
  mode?: ContextMode;
  model?: string;
  outputRenderingFormat?: ActionOutputRenderingFormat;
  useBackgroundInfo?: boolean;
  useLanguageLevelInfo?: boolean;
  parentIds?: number[];
  childrenIds?: number[];
  language?: string; // 语言代码
}

export interface UpdateActionRequest extends Partial<CreateActionRequest> {
  id: number;
}

// ActionGroup 创建/更新请求类型
export interface CreateActionGroupRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  price?: number;
  version: string;
  language?: string;
}

export interface UpdateActionGroupRequest extends Partial<CreateActionGroupRequest> {
  id: string;
}

// 数据库查询选项
export interface ActionQueryOptions {
  userId?: string;
  isBuiltin?: boolean;
  language?: string;
  groups?: string[];
  limit?: number;
  offset?: number;
}

export interface ActionGroupQueryOptions {
  language?: string;
  category?: string;
  limit?: number;
  offset?: number;
}
