/**
 * 小说创作工具 - 类型定义
 */

// ========== 小说项目 ==========

export interface Novel {
  id: string;
  title: string;              // 小说标题
  description?: string;        // 小说简介
  globalPrompt?: string;       // 全局写作Prompt
  coverImage?: string;         // 封面图片
  createdAt: Date;
  updatedAt: Date;
}

// ========== 人物相关类型 ==========

export interface Character {
  id: string;
  novelId: string;            // 所属小说项目ID
  name: string;
  avatar?: string;
  basicInfo: CharacterBasicInfo;
  timeline: CharacterTimelineEvent[];
  relationships: CharacterRelationship[];
  references: Reference[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterBasicInfo {
  description?: string;  // 包含年龄、性别、职业、外貌、性格等所有描述
  appearance?: string;   // 外貌描述
  personality?: string;  // 性格描述
  characterArc?: string; // 人物弧光
}

export interface CharacterTimelineEvent {
  id: string;
  date: string; // 支持精确日期(YYYY-MM-DD)或灵活描述("春天", "战争前夕")
  eventType: 'birth' | 'death' | 'custom';
  title: string;
  description?: string;
  relatedCharacters?: string[]; // 关联人物ID
  relatedLocations?: string[]; // 关联地点ID
}

export interface CharacterRelationship {
  id: string;
  targetCharacterId: string; // 关联的人物ID
  relationshipType: string; // 关系类型(可自定义: "家人", "朋友", "敌人"等)
  description?: string;
  isBidirectional: boolean; // 是否双向关联
}

// ========== 地点相关类型 ==========

export interface Location {
  id: string;
  novelId: string;            // 所属小说项目ID
  name: string;
  image?: string;
  description?: string;
  type?: string; // 地点类型(城市/建筑/自然景观等)
  relatedCharacters?: string[]; // 关联人物ID
  relatedEvents?: string[]; // 关联事件ID
  references: Reference[];
  createdAt: Date;
  updatedAt: Date;
}

// ========== 引用记录 ==========

export interface Reference {
  id: string;
  chapterId: string; // 章节ID
  content: string; // 引用内容片段
  createdAt: Date;
}

// ========== Prompt卡片 ==========

export interface PromptCard {
  id: string;
  novelId: string;            // 所属小说项目ID
  name: string;               // Prompt卡片名称,如"简洁语言风格"
  description: string;        // 具体的操作描述,如"使用更简单的语言,避免复杂句式"
  exampleBefore: string;      // 示例文本(1):演示怎样是符合描述的文本
  exampleAfter: string;       // 示例文本(2):按照上述示例和操作描述生成的文本
  createdAt: Date;
  updatedAt: Date;
}

// ========== 设定卡片 ==========

export interface SettingCard {
  id: string;
  novelId: string;            // 所属小说项目ID
  name: string;               // 设定名称,如"魔法系统"、"世界观"
  category: string;           // 设定分类,如"世界设定"、"背景设定"、"功能设定"
  description: string;        // 设定的详细描述
  createdAt: Date;
  updatedAt: Date;
}

// ========== 事件卡片 ==========

export interface EventCard {
  id: string;
  novelId: string;            // 所属小说项目ID
  name: string;               // 事件名称,如"真心话游戏开始"
  outline: string;            // 事件大纲/概述
  process: EventProcess[];    // 事件流程(前因后果)
  relatedCharacterIds: string[]; // 参与的人物ID列表
  relatedLocationIds: string[];  // 发生的地点ID列表
  createdAt: Date;
  updatedAt: Date;
}

export interface EventProcess {
  id: string;
  order: number;              // 顺序
  description: string;        // 该步骤的描述
}

// ========== Menu卡片 ==========

export interface MenuCard {
  id: string;
  novelId: string;            // 所属小说项目ID
  name: string;               // 菜单项名称,如"使用更好的词汇"
  description: string;        // 菜单项的具体描述,如"根据上下文将选中文本替换为更合适的表达"
  promptTemplate: string;     // 发送给AI的prompt模板,可以使用{{selectedText}}和{{context}}占位符
  enabled: boolean;           // 是否启用该菜单项
  order: number;              // 显示顺序
  promptCardIds?: string[];   // 关联的Prompt卡片ID列表
  characterIds?: string[];    // 关联的人物卡片ID列表
  createdAt: Date;
  updatedAt: Date;
}

// ========== 世界时间线 ==========

export interface WorldTimelineEvent {
  id: string;
  novelId: string;            // 所属小说项目ID
  date: string; // 精确日期或灵活描述
  title: string;
  description?: string;
  type: 'world' | 'background';
  relatedCharacters?: string[];
  relatedLocations?: string[];
}

// ========== 章节结构 ==========

export interface ChapterTimelineItem {
  id: string;
  order: number;
  content: string;
  modificationSuggestion?: string; // 修改建议
  isReviewed?: boolean; // 是否已审核（用于段落保留功能）
  targetWordCount?: number; // 目标字数 (用于生成初稿时控制详细程度)
}

// ========== 章节版本 ==========

export interface ChapterVersion {
  id: string;
  chapterId: string;
  version: number; // 版本号（1, 2, 3...）
  content: string; // 完整章节内容
  timeline: ChapterTimelineItem[]; // 时间线快照
  createdAt: Date;
  description: string; // 版本描述（如"初稿"、"第1次修改"）
}

export interface Chapter {
  id: string;
  novelId: string;            // 所属小说项目ID
  volumeId: string; // 卷ID
  chapterId: string; // 章ID
  sectionId: string; // 节ID
  title: string;
  content: string;
  selectedCharacters?: string[]; // 关联人物ID
  selectedLocations?: string[]; // 关联地点ID
  plotSummary?: string; // 情节概括
  chapterPrompt?: string; // 章节Prompt
  timeline?: ChapterTimelineItem[]; // 剧情时间线
  currentVersion?: number; // 当前版本号
  versions?: ChapterVersion[]; // 版本历史（最多保存10个）
  createdAt: Date;
  updatedAt: Date;
}

// ========== 小说上下文 ==========

export interface NovelContext {
  novelId?: string;  // 小说项目ID
  chapterInfo?: {
    volume: string;
    chapter: string;
    section: string;
    title: string;
  };
  selectedCharacters?: Character[];
  selectedLocations?: Location[];
  selectedPrompts?: PromptCard[];
  selectedSettings?: SettingCard[];  // 选中的设定卡片
  selectedEvents?: EventCard[];      // 选中的事件卡片
  plotSummary?: string;
  globalPrompt?: string;
  chapterPrompt?: string;
}

// ========== 存储适配器接口 ==========

export interface StorageAdapter {
  /**
   * 创建数据
   * @param collection 集合名称 (characters, locations, worldTimeline, chapters, novelSettings, novels)
   * @param data 数据对象
   * @returns 创建的数据ID
   */
  create(collection: string, data: any): Promise<string>;

  /**
   * 读取数据
   * @param collection 集合名称
   * @param id 数据ID
   * @returns 数据对象
   */
  read(collection: string, id: string): Promise<any>;

  /**
   * 更新数据
   * @param collection 集合名称
   * @param id 数据ID
   * @param data 更新的数据
   */
  update(collection: string, id: string, data: any): Promise<void>;

  /**
   * 删除数据
   * @param collection 集合名称
   * @param id 数据ID
   */
  delete(collection: string, id: string): Promise<void>;

  /**
   * 列出所有数据
   * @param collection 集合名称
   * @returns 数据数组
   */
  list(collection: string): Promise<any[]>;

  /**
   * 按novelId过滤列表数据
   * @param collection 集合名称
   * @param novelId 小说项目ID
   * @returns 数据数组
   */
  listByNovelId?(collection: string, novelId: string): Promise<any[]>;
}

