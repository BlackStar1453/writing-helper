/**
 * Actions 数据库操作函数
 * 提供 Actions 的 CRUD 操作和批量导入功能
 */

import { db } from '@/lib/db/drizzle';
import { actions, actionGroups, actionGroupRelations } from '@/lib/db/schema';
import { eq, and, sql, inArray, desc } from 'drizzle-orm';
import { ClientAction, CreateActionRequest, UpdateActionRequest, ActionQueryOptions } from '@/lib/types/actions';

/**
 * 获取用户的 Actions 列表
 */
export async function getUserActions(options: ActionQueryOptions = {}) {
  const {
    userId,
    isBuiltin = false,
    language = 'en',
    groups = [],
    limit = 50,
    offset = 0
  } = options;

  let query = db.select().from(actions);

  // 构建查询条件
  const conditions: any[] = [];
  
  if (isBuiltin) {
    conditions.push(sql`${actions.userId} IS NULL`);
  } else if (userId) {
    conditions.push(eq(actions.userId, userId));
  }

  // 语言过滤
  if (language) {
    conditions.push(eq(actions.language, language));
  }

  if (groups.length > 0) {
    // 检查 groups JSON 数组是否包含指定的组
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM json_array_elements_text(${actions.groups}) AS group_name 
        WHERE group_name = ANY(${groups})
      )`
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query
    .orderBy(desc(actions.isFrequentlyUsed), actions.idx, actions.createdAt)
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * 根据 ID 获取单个 Action
 */
export async function getActionById(id: number) {
  const [action] = await db
    .select()
    .from(actions)
    .where(eq(actions.id, id))
    .limit(1);

  return action || null;
}

/**
 * 创建新的 Action
 */
export async function createAction(data: CreateActionRequest & { userId?: string }) {
  const actionData = {
    userId: data.userId || null,
    idx: await getNextActionIndex(data.userId),
    name: data.name,
    mode: data.mode || null,
    model: data.model || null,
    groups: JSON.stringify(data.groups),
    icon: data.icon || null,
    rolePrompt: data.rolePrompt || null,
    commandPrompt: data.commandPrompt || null,
    outputRenderingFormat: data.outputRenderingFormat || null,
    parentIds: data.parentIds ? JSON.stringify(data.parentIds) : null,
    childrenIds: data.childrenIds ? JSON.stringify(data.childrenIds) : null,
    useBackgroundInfo: data.useBackgroundInfo || false,
    useLanguageLevelInfo: data.useLanguageLevelInfo || false,
    isFrequentlyUsed: false,
    language: data.language || 'en',
  };

  const [newAction] = await db.insert(actions).values(actionData).returning();
  return newAction;
}

/**
 * 批量创建 Actions
 */
export async function createActionsInBatch(actionsData: (CreateActionRequest & { userId?: string })[]) {
  if (actionsData.length === 0) return [];

  const userId = actionsData[0].userId;
  let nextIdx = await getNextActionIndex(userId);

  const formattedData = actionsData.map((data) => ({
    userId: data.userId || null,
    idx: nextIdx++,
    name: data.name,
    mode: data.mode || null,
    model: data.model || null,
    groups: JSON.stringify(data.groups),
    icon: data.icon || null,
    rolePrompt: data.rolePrompt || null,
    commandPrompt: data.commandPrompt || null,
    outputRenderingFormat: data.outputRenderingFormat || null,
    parentIds: data.parentIds ? JSON.stringify(data.parentIds) : null,
    childrenIds: data.childrenIds ? JSON.stringify(data.childrenIds) : null,
    useBackgroundInfo: data.useBackgroundInfo || false,
    useLanguageLevelInfo: data.useLanguageLevelInfo || false,
    isFrequentlyUsed: false,
    language: data.language || 'en',
  }));

  const newActions = await db.insert(actions).values(formattedData).returning();
  return newActions;
}

/**
 * 更新 Action
 */
export async function updateAction(id: number, data: Partial<UpdateActionRequest>) {
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.mode !== undefined) updateData.mode = data.mode;
  if (data.model !== undefined) updateData.model = data.model;
  if (data.groups !== undefined) updateData.groups = JSON.stringify(data.groups);
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.rolePrompt !== undefined) updateData.rolePrompt = data.rolePrompt;
  if (data.commandPrompt !== undefined) updateData.commandPrompt = data.commandPrompt;
  if (data.outputRenderingFormat !== undefined) updateData.outputRenderingFormat = data.outputRenderingFormat;
  if (data.parentIds !== undefined) updateData.parentIds = data.parentIds ? JSON.stringify(data.parentIds) : null;
  if (data.childrenIds !== undefined) updateData.childrenIds = data.childrenIds ? JSON.stringify(data.childrenIds) : null;
  if (data.useBackgroundInfo !== undefined) updateData.useBackgroundInfo = data.useBackgroundInfo;
  if (data.useLanguageLevelInfo !== undefined) updateData.useLanguageLevelInfo = data.useLanguageLevelInfo;

  updateData.updatedAt = sql`CURRENT_TIMESTAMP`;

  const [updatedAction] = await db
    .update(actions)
    .set(updateData)
    .where(eq(actions.id, id))
    .returning();

  return updatedAction || null;
}

/**
 * 删除 Action
 */
export async function deleteAction(id: number) {
  const [deletedAction] = await db
    .delete(actions)
    .where(eq(actions.id, id))
    .returning();

  return deletedAction || null;
}

/**
 * 批量删除 Actions
 */
export async function deleteActionsInBatch(ids: number[]) {
  if (ids.length === 0) return [];

  const deletedActions = await db
    .delete(actions)
    .where(inArray(actions.id, ids))
    .returning();

  return deletedActions;
}

/**
 * 获取下一个 Action 索引
 */
async function getNextActionIndex(userId?: string | null): Promise<number> {
  const condition = userId ? eq(actions.userId, userId) : sql`${actions.userId} IS NULL`;
  
  const [result] = await db
    .select({ maxIdx: sql<number>`COALESCE(MAX(${actions.idx}), 0)` })
    .from(actions)
    .where(condition);

  return (result?.maxIdx || 0) + 1;
}

/**
 * 安全解析JSON字符串
 */
function safeJsonParse(jsonString: string | null, defaultValue: any = null) {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON解析失败:', error, 'JSON字符串:', jsonString);
    return defaultValue;
  }
}

/**
 * 将数据库 Action 转换为客户端格式
 */
export function convertToClientAction(dbAction: any): ClientAction {
  try {
    return {
      userId: dbAction.userId,
      id: dbAction.id,
      idx: dbAction.idx,
      mode: dbAction.mode,
      name: dbAction.name,
      model: dbAction.model,
      groups: safeJsonParse(dbAction.groups, []),
      icon: dbAction.icon,
      rolePrompt: dbAction.rolePrompt,
      commandPrompt: dbAction.commandPrompt,
      outputRenderingFormat: dbAction.outputRenderingFormat,
      parentIds: safeJsonParse(dbAction.parentIds, undefined),
      childrenIds: safeJsonParse(dbAction.childrenIds, undefined),
      useBackgroundInfo: dbAction.useBackgroundInfo || false,
      useLanguageLevelInfo: dbAction.useLanguageLevelInfo || false,
      isFrequentlyUsed: dbAction.isFrequentlyUsed || false,
      language: dbAction.language || 'en',
      createdAt: dbAction.createdAt ? dbAction.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: dbAction.updatedAt ? dbAction.updatedAt.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error('转换Action数据失败:', error, 'dbAction:', dbAction);
    // 返回一个基本的Action对象，避免完全失败
    return {
      userId: dbAction.userId,
      id: dbAction.id,
      idx: dbAction.idx || 0,
      name: dbAction.name || 'Unknown Action',
      groups: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * 获取 Actions 统计信息
 */
export async function getActionsStats(userId?: string) {
  const condition = userId ? eq(actions.userId, userId) : sql`${actions.userId} IS NULL`;
  
  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      frequentlyUsed: sql<number>`COUNT(*) FILTER (WHERE ${actions.isFrequentlyUsed} = true)`,
    })
    .from(actions)
    .where(condition);

  return stats;
}
