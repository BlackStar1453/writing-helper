/**
 * 小说创作工具 - 类型定义
 */

// ========== 人物相关类型 ==========

export interface Character {
  id: string;
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
  age?: number;
  gender?: string;
  occupation?: string;
  description?: string;
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

// ========== 世界时间线 ==========

export interface WorldTimelineEvent {
  id: string;
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
}

export interface Chapter {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
}

// ========== 小说上下文 ==========

export interface NovelContext {
  chapterInfo?: {
    volume: string;
    chapter: string;
    section: string;
    title: string;
  };
  selectedCharacters?: Character[];
  selectedLocations?: Location[];
  plotSummary?: string;
  globalPrompt?: string;
  chapterPrompt?: string;
}

// ========== 存储适配器接口 ==========

export interface StorageAdapter {
  /**
   * 创建数据
   * @param collection 集合名称 (characters, locations, worldTimeline, chapters, novelSettings)
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
}

