import { desc, and, eq, isNull, lt, sql } from 'drizzle-orm';
import { db } from './drizzle';
import { users, shareRecords, features, featureVotes, featureTranslations } from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'string'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  // 检查是否需要重置用量统计（每30天）
  if (user[0].usageLastResetAt) {
    const lastReset = new Date(user[0].usageLastResetAt);
    const now = new Date();
    const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceReset >= 30) {
      await resetUserUsage(user[0].id);
      user[0].premiumRequestsUsed = 0;
      user[0].fastRequestsUsed = 0;
      user[0].usageLastResetAt = now;
    }
  }

  return user[0];
}

// 用户基本操作
export async function getUserById(userId: string) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateUser(
  userId: string,
  userData: {
    name?: string;
    email?: string;
    role?: string;
    pendingOrderId?: string | null;
    pendingProductName?: string | null;
    lastXorpayOrderId?: string | null;
    xorpayAoid?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeProductId?: string | null;
    planName?: string | null;
    subscriptionStatus?: string | null;
    subscriptionInterval?: string | null;
    subscriptionExpiresAt?: Date | null;
    premiumRequestsLimit?: number;
    fastRequestsLimit?: number;
    premiumRequestsUsed?: number;
    fastRequestsUsed?: number;
    premiumType?: string | null;
  }
) {
  await db
    .update(users)
    .set({
      ...userData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

// 用户订阅后，更新限制用量并且设置当前用量为0
export async function updateUserSubscription(userId: string, subscriptionData: {
  fastRequestsLimit: number;
  premiumRequestsLimit: number;
}) {
  await db.update(users).set({
    fastRequestsLimit: subscriptionData.fastRequestsLimit,
    premiumRequestsLimit: subscriptionData.premiumRequestsLimit,
    fastRequestsUsed: 0,
    premiumRequestsUsed: 0,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

// 用量统计相关操作
export async function incrementPremiumRequests(userId: string) {
  await db
    .update(users)
    .set({
      premiumRequestsUsed: sql`${users.premiumRequestsUsed} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function incrementFastRequests(userId: string) {
  await db
    .update(users)
    .set({
      fastRequestsUsed: sql`${users.fastRequestsUsed} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function resetUserUsage(userId: string) {
  await db
    .update(users)
    .set({
      premiumRequestsUsed: 0,
      fastRequestsUsed: 0,
      usageLastResetAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

// 检查用户是否超出配额
export async function isPremiumRequestsQuotaExceeded(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return true;
  
  return (user.premiumRequestsUsed ?? 0) >= (user.premiumRequestsLimit ?? 50);
}

// 检查用户快速请求是否超出配额
export async function isFastRequestsQuotaExceeded(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return true;

  return (user.fastRequestsUsed ?? 0) >= (user.fastRequestsLimit ?? 150);
}

// 转发记录相关操作
export async function createShareRecord(data: {
  userId: string;
  platform: string;
  imageUrl?: string;
  rewardAmount: number;
  rewardType: 'fast' | 'premium';
}) {
  // 检查用户是否已经在该平台有已验证的记录
  const existingRecord = await db
    .select()
    .from(shareRecords)
    .where(
      and(
        eq(shareRecords.userId, data.userId),
        eq(shareRecords.platform, data.platform),
        eq(shareRecords.status, 'verified')
      )
    )
    .limit(1);

  if (existingRecord.length > 0) {
    throw new Error(`您已经在${data.platform}平台完成过转发验证`);
  }

  // 生成随机验证时间（1-24小时后）
  const now = new Date();
  const randomHours = Math.floor(Math.random() * 23) + 1; // 1-24小时
  const scheduledVerifyAt = new Date(now.getTime() + randomHours * 60 * 60 * 1000);

  const [record] = await db
    .insert(shareRecords)
    .values({
      userId: data.userId,
      platform: data.platform,
      imageUrl: data.imageUrl,
      rewardAmount: data.rewardAmount,
      rewardType: data.rewardType,
      scheduledVerifyAt,
      status: 'pending'
    })
    .returning();

  return record;
}

export async function getUserShareRecords(userId: string) {
  return await db
    .select()
    .from(shareRecords)
    .where(eq(shareRecords.userId, userId))
    .orderBy(desc(shareRecords.createdAt));
}

export async function getPendingShareRecords() {
  const now = new Date();
  return await db
    .select()
    .from(shareRecords)
    .where(
      and(
        eq(shareRecords.status, 'pending'),
        sql`(${shareRecords.scheduledVerifyAt} IS NULL OR ${shareRecords.scheduledVerifyAt} < ${now.toISOString()})`
      )
    );
}

export async function verifyShareRecord(recordId: string) {
  const [record] = await db
    .update(shareRecords)
    .set({
      status: 'verified',
      verifiedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(shareRecords.id, recordId))
    .returning();

  if (!record) {
    throw new Error('转发记录不存在');
  }

  // 增加用户的使用次数
  const user = await getUserById(record.userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  if (record.rewardType === 'fast') {
    const newLimit = (user.fastRequestsLimit || 50) + (record.rewardAmount || 0);
    await updateUser(record.userId, {
      fastRequestsLimit: newLimit
    });
  } else if (record.rewardType === 'premium') {
    const newLimit = (user.premiumRequestsLimit || 10) + (record.rewardAmount || 0);
    await updateUser(record.userId, {
      premiumRequestsLimit: newLimit
    });
  }

  return record;
}

// ==================== 多语言功能查询 ====================

/**
 * 获取功能的多语言内容
 * @param featureId 功能ID
 * @param locale 语言代码 (如: 'zh', 'ja', 'ko')
 * @param fallbackToEnglish 如果指定语言不存在，是否回退到英文
 */
export async function getFeatureWithTranslation(
  featureId: string,
  locale: string = 'en',
  fallbackToEnglish: boolean = true
) {
  // 首先获取基础功能信息
  const [feature] = await db
    .select()
    .from(features)
    .where(eq(features.id, featureId))
    .limit(1);

  if (!feature) {
    return null;
  }

  // 如果请求的是中文，直接返回原始内容（因为原始数据是中文）
  if (locale === 'zh') {
    return {
      ...feature,
      locale: 'zh',
      isTranslated: false
    };
  }

  // 查找指定语言的翻译
  const [translation] = await db
    .select()
    .from(featureTranslations)
    .where(and(
      eq(featureTranslations.featureId, featureId),
      eq(featureTranslations.locale, locale)
    ))
    .limit(1);

  if (translation) {
    // 返回翻译版本
    return {
      ...feature,
      title: translation.title,
      description: translation.description,
      locale: locale,
      isTranslated: true,
      translationId: translation.id,
      translationUpdatedAt: translation.updatedAt
    };
  }

  // 如果没有找到翻译且允许回退到中文原始内容
  if (fallbackToEnglish) {
    return {
      ...feature,
      locale: 'zh', // 回退到中文原始内容
      isTranslated: false,
      fallbackUsed: true
    };
  }

  // 不允许回退，返回null
  return null;
}

/**
 * 获取所有功能的多语言列表
 * @param locale 语言代码
 * @param fallbackToEnglish 是否回退到英文
 */
export async function getFeaturesWithTranslations(
  locale: string = 'en',
  fallbackToEnglish: boolean = true
) {
  // 获取所有功能
  const allFeatures = await db
    .select()
    .from(features)
    .orderBy(desc(features.priority), desc(features.createdAt));

  if (locale === 'zh') {
    // 如果请求中文，直接返回原始内容（因为原始数据是中文）
    return allFeatures.map(feature => ({
      ...feature,
      locale: 'zh',
      isTranslated: false
    }));
  }

  // 获取所有翻译
  const translations = await db
    .select()
    .from(featureTranslations)
    .where(eq(featureTranslations.locale, locale));

  // 创建翻译映射
  const translationMap = new Map(
    translations.map(t => [t.featureId, t])
  );

  // 合并功能和翻译
  return allFeatures.map(feature => {
    const translation = translationMap.get(feature.id);

    if (translation) {
      return {
        ...feature,
        title: translation.title,
        description: translation.description,
        locale: locale,
        isTranslated: true,
        translationId: translation.id,
        translationUpdatedAt: translation.updatedAt
      };
    }

    // 没有翻译时的处理 - 回退到中文原始内容
    if (fallbackToEnglish) {
      return {
        ...feature,
        locale: 'zh', // 回退到中文原始内容
        isTranslated: false,
        fallbackUsed: true
      };
    }

    // 不回退时返回null，后续过滤掉
    return null;
  }).filter(Boolean); // 过滤掉null值
}

/**
 * 获取功能的所有可用翻译语言
 * @param featureId 功能ID
 */
export async function getFeatureAvailableLocales(featureId: string) {
  const translations = await db
    .select({
      locale: featureTranslations.locale,
      updatedAt: featureTranslations.updatedAt
    })
    .from(featureTranslations)
    .where(eq(featureTranslations.featureId, featureId));

  // 始终包含中文（原始语言）
  const locales = [
    { locale: 'zh', updatedAt: null, isOriginal: true },
    ...translations.map(t => ({ ...t, isOriginal: false }))
  ];

  return locales;
}

/**
 * 创建或更新功能翻译
 * @param featureId 功能ID
 * @param locale 语言代码
 * @param title 翻译标题
 * @param description 翻译描述
 */
export async function upsertFeatureTranslation(
  featureId: string,
  locale: string,
  title: string,
  description: string
) {
  // 检查是否已存在翻译
  const [existing] = await db
    .select()
    .from(featureTranslations)
    .where(and(
      eq(featureTranslations.featureId, featureId),
      eq(featureTranslations.locale, locale)
    ))
    .limit(1);

  if (existing) {
    // 更新现有翻译
    const [updated] = await db
      .update(featureTranslations)
      .set({
        title,
        description,
        updatedAt: new Date()
      })
      .where(eq(featureTranslations.id, existing.id))
      .returning();

    return { translation: updated, isUpdate: true };
  } else {
    // 创建新翻译
    const [created] = await db
      .insert(featureTranslations)
      .values({
        featureId,
        locale,
        title,
        description
      })
      .returning();

    return { translation: created, isUpdate: false };
  }
}

/**
 * 删除功能翻译
 * @param featureId 功能ID
 * @param locale 语言代码
 */
export async function deleteFeatureTranslation(featureId: string, locale: string) {
  const [deleted] = await db
    .delete(featureTranslations)
    .where(and(
      eq(featureTranslations.featureId, featureId),
      eq(featureTranslations.locale, locale)
    ))
    .returning();

  return deleted;
}
