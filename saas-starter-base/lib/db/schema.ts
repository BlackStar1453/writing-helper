import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  uuid,
  boolean,
  unique,
  uniqueIndex,
  decimal
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
  subscriptionInterval: varchar('subscription_interval', { length: 10 }), // 'month' 或 'year'
  subscriptionExpiresAt: timestamp('subscription_expires_at'), // 订阅到期时间
  // 临时使用现有字段的更清晰方案
  // stripeProductId 可以临时用于存储订单状态信息
  premiumRequestsUsed: integer('premium_requests_used').default(0),
  premiumRequestsLimit: integer('premium_requests_limit').default(10),
  fastRequestsLimit: integer('fast_requests_limit').default(50),
  fastRequestsUsed: integer('fast_requests_used').default(0),
  usageLastResetAt: timestamp('usage_last_reset_at').defaultNow(),
  // 设备管理相关字段
  maxDevices: integer('max_devices').default(3), // lifetime用户最多3台设备，其他用户1台
  // Premium类型字段
  premiumType: varchar('premium_type', { length: 20 }).default('use_own_key'), // 'use_own_key' | 'use_elick'
});

// 功能路线图表
export const features = pgTable('features', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('planned'), // planned, inDevelopment, completed
  priority: integer('priority').default(0), // 优先级，数字越大优先级越高
  version: varchar('version', { length: 20 }), // 完成版本号
  completedAt: timestamp('completed_at'), // 完成时间
  estimatedCompletionDate: timestamp('estimated_completion_date'), // 预计完成时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 功能多语言内容表
export const featureTranslations = pgTable('feature_translations', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  locale: varchar('locale', { length: 10 }).notNull(), // en, zh, ja, ko, etc.
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  // 确保每个功能的每种语言只有一个翻译
  uniqueIndex('feature_translations_feature_locale_idx').on(table.featureId, table.locale)
]);

// 功能投票表
export const featureVotes = pgTable('feature_votes', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  voteType: varchar('vote_type', { length: 10 }).notNull().default('like'), // like, dislike
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  // 确保每个用户对每个功能只能投票一次
  unique('feature_votes_user_feature_unique').on(table.userId, table.featureId),
]);

// 设备管理表
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceFingerprint: text('device_fingerprint').notNull().unique(), // 设备指纹
  deviceName: varchar('device_name', { length: 255 }), // 设备名称（用户可设置）
  deviceType: varchar('device_type', { length: 50 }), // 设备类型：desktop, mobile, tablet
  browser: varchar('browser', { length: 100 }), // 浏览器信息
  os: varchar('os', { length: 100 }), // 操作系统信息
  ipAddress: varchar('ip_address', { length: 45 }), // IP地址
  userAgent: text('user_agent'), // 用户代理字符串
  isActive: boolean('is_active').default(true), // 是否活跃
  lastUsedAt: timestamp('last_used_at').notNull().defaultNow(), // 最后使用时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 转发记录表
export const shareRecords = pgTable('share_records', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 50 }).notNull(), // 平台：twitter, xiaohongshu, weibo, etc.
  imageUrl: text('image_url'), // 上传的截图URL
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, verified, rejected
  rewardAmount: integer('reward_amount').default(0), // 奖励的使用次数
  rewardType: varchar('reward_type', { length: 20 }).default('fast'), // fast, premium
  submittedAt: timestamp('submitted_at').notNull().defaultNow(), // 提交时间
  verifiedAt: timestamp('verified_at'), // 验证完成时间
  scheduledVerifyAt: timestamp('scheduled_verify_at'), // 预定验证时间
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 促销活动表
export const promotions = pgTable('promotions', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(), // 促销活动名称
  description: text('description'), // 促销活动描述
  code: varchar('code', { length: 50 }).unique(), // 促销码（可选，用于手动输入）
  discountType: varchar('discount_type', { length: 20 }).notNull(), // 'percentage' | 'fixed_amount'
  discountValue: integer('discount_value').notNull(), // 折扣值（百分比或固定金额，以分为单位）
  targetPlans: text('target_plans').notNull(), // JSON数组，目标计划 ['Premium', 'Lifetime']
  targetPaymentMethods: text('target_payment_methods').notNull(), // JSON数组，目标支付方式 ['stripe', 'xorpay']
  startTime: timestamp('start_time').notNull(), // 开始时间
  endTime: timestamp('end_time').notNull(), // 结束时间
  isActive: boolean('is_active').default(true), // 是否激活
  maxUses: integer('max_uses'), // 最大使用次数（null表示无限制）
  currentUses: integer('current_uses').default(0), // 当前使用次数
  priority: integer('priority').default(0), // 优先级（数字越大优先级越高）
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id), // 创建者
});

// 促销使用记录表
export const promotionUsages = pgTable('promotion_usages', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  promotionId: uuid('promotion_id').notNull().references(() => promotions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planName: varchar('plan_name', { length: 50 }).notNull(), // 使用的计划
  paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // 使用的支付方式
  originalPrice: integer('original_price').notNull(), // 原价（以分为单位）
  discountAmount: integer('discount_amount').notNull(), // 折扣金额（以分为单位）
  finalPrice: integer('final_price').notNull(), // 最终价格（以分为单位）
  stripeSessionId: text('stripe_session_id'), // Stripe会话ID
  xorpayOrderId: text('xorpay_order_id'), // Xorpay订单ID
  usedAt: timestamp('used_at').notNull().defaultNow(),
});

// Actions 表 - 存储用户自定义和内置的 actions
export const actions = pgTable('actions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // null 表示内置 action
  idx: integer('idx').notNull(), // 排序索引
  mode: varchar('mode', { length: 50 }), // ContextMode: 'translate', 'summary', 'explain', etc.
  name: varchar('name', { length: 255 }).notNull(),
  model: varchar('model', { length: 100 }), // 推荐的模型
  groups: text('groups').notNull(), // JSON 数组，存储分组信息
  icon: varchar('icon', { length: 100 }), // 图标名称
  rolePrompt: text('role_prompt'), // 角色提示词
  commandPrompt: text('command_prompt'), // 命令提示词
  outputRenderingFormat: varchar('output_rendering_format', { length: 50 }), // 输出渲染格式
  parentIds: text('parent_ids'), // JSON 数组，父级 action IDs
  childrenIds: text('children_ids'), // JSON 数组，子级 action IDs
  useBackgroundInfo: boolean('use_background_info').default(false),
  useLanguageLevelInfo: boolean('use_language_level_info').default(false),
  isFrequentlyUsed: boolean('is_frequently_used').default(false),
  language: varchar('language', { length: 10 }).default('en'), // 语言代码
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Action Groups 表 - 存储 action 分组信息
export const actionGroups = pgTable('action_groups', {
  id: varchar('id', { length: 100 }).primaryKey(), // 使用字符串 ID
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  price: integer('price').default(0), // 价格，以分为单位
  version: varchar('version', { length: 50 }).notNull(),
  language: varchar('language', { length: 10 }).default('en'), // 语言代码
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Action Group Relations 表 - 存储 action 和 group 的关系
export const actionGroupRelations = pgTable('action_group_relations', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  actionId: integer('action_id').notNull().references(() => actions.id, { onDelete: 'cascade' }),
  groupId: varchar('group_id', { length: 100 }).notNull().references(() => actionGroups.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 加油包配置表
export const boosterOptions = pgTable('booster_options', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  type: varchar('type', { length: 20 }).notNull(), // 'premium' | 'fast'
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  amount: integer('amount').notNull(), // 使用次数
  stripePrice: integer('stripe_price').notNull(), // 美分
  xorpayPrice: integer('xorpay_price').notNull(), // 人民币分
  isPopular: boolean('is_popular').default(false),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0), // 排序
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// 社交平台配置表
export const sharePlatforms = pgTable('share_platforms', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  platformId: varchar('platform_id', { length: 50 }).notNull().unique(), // 'twitter', 'xiaohongshu', 'weibo'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  rewardAmount: integer('reward_amount').default(100), // 奖励的使用次数
  rewardType: varchar('reward_type', { length: 20 }).default('fast'), // 'fast' | 'premium'
  shareUrl: text('share_url'), // 分享的URL
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0), // 排序
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type ShareRecord = typeof shareRecords.$inferSelect;
export type NewShareRecord = typeof shareRecords.$inferInsert;
export type Promotion = typeof promotions.$inferSelect;
export type NewPromotion = typeof promotions.$inferInsert;
export type PromotionUsage = typeof promotionUsages.$inferSelect;
export type NewPromotionUsage = typeof promotionUsages.$inferInsert;
export type BoosterOption = typeof boosterOptions.$inferSelect;
export type NewBoosterOption = typeof boosterOptions.$inferInsert;
export type SharePlatform = typeof sharePlatforms.$inferSelect;
export type NewSharePlatform = typeof sharePlatforms.$inferInsert;
export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;
export type ActionGroup = typeof actionGroups.$inferSelect;
export type NewActionGroup = typeof actionGroups.$inferInsert;
export type ActionGroupRelation = typeof actionGroupRelations.$inferSelect;
export type NewActionGroupRelation = typeof actionGroupRelations.$inferInsert;

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
}

// 用户试用API Key表
export const userTrialKeys = pgTable('user_trial_keys', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  openrouterKeyHash: varchar('openrouter_key_hash', { length: 255 }).notNull(),
  openrouterApiKey: text('openrouter_api_key').notNull(),
  usageCount: integer('usage_count').default(0),
  maxUsageCount: integer('max_usage_count').default(50),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 6 }).default('0.0001'),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  // 确保每个用户只有一个活跃的试用Key
  uniqueIndex('user_trial_keys_user_id_active_idx').on(table.userId)
]);
