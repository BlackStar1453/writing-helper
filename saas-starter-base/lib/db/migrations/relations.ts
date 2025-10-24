import { relations } from "drizzle-orm/relations";
import { features, featureTranslations, users, devices, actions, actionGroupRelations, actionGroups, promotions, featureVotes, shareRecords, promotionUsages } from "./schema";

export const featureTranslationsRelations = relations(featureTranslations, ({one}) => ({
	feature: one(features, {
		fields: [featureTranslations.featureId],
		references: [features.id]
	}),
}));

export const featuresRelations = relations(features, ({many}) => ({
	featureTranslations: many(featureTranslations),
	featureVotes: many(featureVotes),
}));

export const devicesRelations = relations(devices, ({one}) => ({
	user: one(users, {
		fields: [devices.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	devices: many(devices),
	actions: many(actions),
	promotions: many(promotions),
	featureVotes: many(featureVotes),
	shareRecords: many(shareRecords),
	promotionUsages: many(promotionUsages),
}));

export const actionGroupRelationsRelations = relations(actionGroupRelations, ({one}) => ({
	action: one(actions, {
		fields: [actionGroupRelations.actionId],
		references: [actions.id]
	}),
	actionGroup: one(actionGroups, {
		fields: [actionGroupRelations.groupId],
		references: [actionGroups.id]
	}),
}));

export const actionsRelations = relations(actions, ({one, many}) => ({
	actionGroupRelations: many(actionGroupRelations),
	user: one(users, {
		fields: [actions.userId],
		references: [users.id]
	}),
}));

export const actionGroupsRelations = relations(actionGroups, ({many}) => ({
	actionGroupRelations: many(actionGroupRelations),
}));

export const promotionsRelations = relations(promotions, ({one, many}) => ({
	user: one(users, {
		fields: [promotions.createdBy],
		references: [users.id]
	}),
	promotionUsages: many(promotionUsages),
}));

export const featureVotesRelations = relations(featureVotes, ({one}) => ({
	feature: one(features, {
		fields: [featureVotes.featureId],
		references: [features.id]
	}),
	user: one(users, {
		fields: [featureVotes.userId],
		references: [users.id]
	}),
}));

export const shareRecordsRelations = relations(shareRecords, ({one}) => ({
	user: one(users, {
		fields: [shareRecords.userId],
		references: [users.id]
	}),
}));

export const promotionUsagesRelations = relations(promotionUsages, ({one}) => ({
	promotion: one(promotions, {
		fields: [promotionUsages.promotionId],
		references: [promotions.id]
	}),
	user: one(users, {
		fields: [promotionUsages.userId],
		references: [users.id]
	}),
}));