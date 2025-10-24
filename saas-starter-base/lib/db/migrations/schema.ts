import { pgTable, uniqueIndex, foreignKey, uuid, varchar, text, timestamp, unique, boolean, integer, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const featureTranslations = pgTable("feature_translations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	featureId: uuid("feature_id").notNull(),
	locale: varchar({ length: 10 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("feature_translations_feature_locale_idx").using("btree", table.featureId.asc().nullsLast().op("text_ops"), table.locale.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.featureId],
			foreignColumns: [features.id],
			name: "feature_translations_feature_id_features_id_fk"
		}).onDelete("cascade"),
]);

export const devices = pgTable("devices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	deviceFingerprint: text("device_fingerprint").notNull(),
	deviceName: varchar("device_name", { length: 255 }),
	deviceType: varchar("device_type", { length: 50 }),
	browser: varchar({ length: 100 }),
	os: varchar({ length: 100 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	isActive: boolean("is_active").default(true),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "devices_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("devices_device_fingerprint_unique").on(table.deviceFingerprint),
]);

export const actionGroupRelations = pgTable("action_group_relations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	actionId: integer("action_id").notNull(),
	groupId: varchar("group_id", { length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.actionId],
			foreignColumns: [actions.id],
			name: "action_group_relations_action_id_actions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [actionGroups.id],
			name: "action_group_relations_group_id_action_groups_id_fk"
		}).onDelete("cascade"),
]);

export const actionGroups = pgTable("action_groups", {
	id: varchar({ length: 100 }).primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }).notNull(),
	price: integer().default(0),
	version: varchar({ length: 50 }).notNull(),
	language: varchar({ length: 10 }).default('en'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const actions = pgTable("actions", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id"),
	idx: integer().notNull(),
	mode: varchar({ length: 50 }),
	name: varchar({ length: 255 }).notNull(),
	model: varchar({ length: 100 }),
	groups: text().notNull(),
	icon: varchar({ length: 100 }),
	rolePrompt: text("role_prompt"),
	commandPrompt: text("command_prompt"),
	outputRenderingFormat: varchar("output_rendering_format", { length: 50 }),
	parentIds: text("parent_ids"),
	childrenIds: text("children_ids"),
	useBackgroundInfo: boolean("use_background_info").default(false),
	useLanguageLevelInfo: boolean("use_language_level_info").default(false),
	isFrequentlyUsed: boolean("is_frequently_used").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	language: varchar({ length: 10 }).default('en'),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "actions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	name: varchar({ length: 100 }),
	email: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 20 }).default('member').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	stripeProductId: text("stripe_product_id"),
	planName: varchar("plan_name", { length: 50 }),
	subscriptionStatus: varchar("subscription_status", { length: 20 }),
	premiumRequestsUsed: integer("premium_requests_used").default(0),
	premiumRequestsLimit: integer("premium_requests_limit").default(10),
	fastRequestsLimit: integer("fast_requests_limit").default(50),
	fastRequestsUsed: integer("fast_requests_used").default(0),
	usageLastResetAt: timestamp("usage_last_reset_at", { mode: 'string' }).defaultNow(),
	maxDevices: integer("max_devices").default(3),
	subscriptionInterval: varchar("subscription_interval", { length: 10 }),
	subscriptionExpiresAt: timestamp("subscription_expires_at", { mode: 'string' }),
}, (table) => [
	unique("users_email_unique").on(table.email),
	unique("users_stripe_customer_id_unique").on(table.stripeCustomerId),
	unique("users_stripe_subscription_id_unique").on(table.stripeSubscriptionId),
]);

export const promotions = pgTable("promotions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	discountType: varchar("discount_type", { length: 20 }).notNull(),
	discountValue: integer("discount_value").notNull(),
	targetPlans: text("target_plans").notNull(),
	targetPaymentMethods: text("target_payment_methods").notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true),
	maxUses: integer("max_uses"),
	currentUses: integer("current_uses").default(0),
	priority: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	code: varchar({ length: 50 }),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "promotions_created_by_users_id_fk"
		}),
	unique("promotions_code_unique").on(table.code),
]);

export const features = pgTable("features", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	status: varchar({ length: 20 }).default('planned').notNull(),
	priority: integer().default(0),
	version: varchar({ length: 20 }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const featureVotes = pgTable("feature_votes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	featureId: uuid("feature_id").notNull(),
	userId: uuid("user_id").notNull(),
	voteType: varchar("vote_type", { length: 10 }).default('like').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.featureId],
			foreignColumns: [features.id],
			name: "feature_votes_feature_id_features_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "feature_votes_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("feature_votes_user_feature_unique").on(table.featureId, table.userId),
]);

export const shareRecords = pgTable("share_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	platform: varchar({ length: 50 }).notNull(),
	imageUrl: text("image_url"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	rewardAmount: integer("reward_amount").default(0),
	rewardType: varchar("reward_type", { length: 20 }).default('fast'),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow().notNull(),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	scheduledVerifyAt: timestamp("scheduled_verify_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "share_records_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const promotionUsages = pgTable("promotion_usages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	promotionId: uuid("promotion_id").notNull(),
	userId: uuid("user_id").notNull(),
	planName: varchar("plan_name", { length: 50 }).notNull(),
	paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
	originalPrice: integer("original_price").notNull(),
	discountAmount: integer("discount_amount").notNull(),
	finalPrice: integer("final_price").notNull(),
	stripeSessionId: text("stripe_session_id"),
	xorpayOrderId: text("xorpay_order_id"),
	usedAt: timestamp("used_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.promotionId],
			foreignColumns: [promotions.id],
			name: "promotion_usages_promotion_id_promotions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "promotion_usages_user_id_users_id_fk"
		}).onDelete("cascade"),
]);
