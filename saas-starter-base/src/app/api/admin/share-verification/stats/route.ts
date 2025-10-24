import { NextResponse } from 'next/server';
import { verifyAdminAPI } from '@/lib/auth/admin-middleware';
import { db } from '@/lib/db/drizzle';
import { shareRecords } from '@/lib/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';

// GET - 获取转发验证统计信息（管理员）
export async function GET() {
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 总体统计
    const [totalStats] = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        verified: sql<number>`count(*) filter (where status = 'verified')`,
        rejected: sql<number>`count(*) filter (where status = 'rejected')`,
      })
      .from(shareRecords);

    // 今日统计
    const [todayStats] = await db
      .select({
        submitted: sql<number>`count(*)`,
        verified: sql<number>`count(*) filter (where status = 'verified')`,
      })
      .from(shareRecords)
      .where(gte(shareRecords.createdAt, today));

    // 本周统计
    const [weekStats] = await db
      .select({
        submitted: sql<number>`count(*)`,
        verified: sql<number>`count(*) filter (where status = 'verified')`,
      })
      .from(shareRecords)
      .where(gte(shareRecords.createdAt, thisWeek));

    // 本月统计
    const [monthStats] = await db
      .select({
        submitted: sql<number>`count(*)`,
        verified: sql<number>`count(*) filter (where status = 'verified')`,
      })
      .from(shareRecords)
      .where(gte(shareRecords.createdAt, thisMonth));

    // 平台统计
    const platformStats = await db
      .select({
        platform: shareRecords.platform,
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        verified: sql<number>`count(*) filter (where status = 'verified')`,
        rejected: sql<number>`count(*) filter (where status = 'rejected')`,
      })
      .from(shareRecords)
      .groupBy(shareRecords.platform)
      .orderBy(sql`count(*) desc`);

    // 过期记录统计（超过24小时未验证）
    const overdueThreshold = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25小时前
    const [overdueStats] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(shareRecords)
      .where(
        and(
          eq(shareRecords.status, 'pending'),
          sql`${shareRecords.scheduledVerifyAt} < ${overdueThreshold.toISOString()}`
        )
      );

    // 最近7天的每日统计
    const dailyStats = await db
      .select({
        date: sql<string>`date(${shareRecords.createdAt})`,
        submitted: sql<number>`count(*)`,
        verified: sql<number>`count(*) filter (where status = 'verified')`,
      })
      .from(shareRecords)
      .where(gte(shareRecords.createdAt, thisWeek))
      .groupBy(sql`date(${shareRecords.createdAt})`)
      .orderBy(sql`date(${shareRecords.createdAt})`);

    // 奖励统计
    const [rewardStats] = await db
      .select({
        totalRewards: sql<number>`sum(reward_amount) filter (where status = 'verified')`,
        fastRewards: sql<number>`sum(reward_amount) filter (where status = 'verified' and reward_type = 'fast')`,
        premiumRewards: sql<number>`sum(reward_amount) filter (where status = 'verified' and reward_type = 'premium')`,
      })
      .from(shareRecords);

    return NextResponse.json({
      overview: {
        total: totalStats.total || 0,
        pending: totalStats.pending || 0,
        verified: totalStats.verified || 0,
        rejected: totalStats.rejected || 0,
        overdue: overdueStats.count || 0,
      },
      timeStats: {
        today: {
          submitted: todayStats.submitted || 0,
          verified: todayStats.verified || 0,
        },
        week: {
          submitted: weekStats.submitted || 0,
          verified: weekStats.verified || 0,
        },
        month: {
          submitted: monthStats.submitted || 0,
          verified: monthStats.verified || 0,
        },
      },
      platformStats: platformStats.map(stat => ({
        platform: stat.platform,
        total: stat.total || 0,
        pending: stat.pending || 0,
        verified: stat.verified || 0,
        rejected: stat.rejected || 0,
      })),
      dailyStats: dailyStats.map(stat => ({
        date: stat.date,
        submitted: stat.submitted || 0,
        verified: stat.verified || 0,
      })),
      rewards: {
        total: rewardStats.totalRewards || 0,
        fast: rewardStats.fastRewards || 0,
        premium: rewardStats.premiumRewards || 0,
      },
      lastUpdated: now.toISOString(),
    });

  } catch (error) {
    console.error('获取统计信息失败:', error);
    return NextResponse.json(
      { error: '获取统计信息失败' },
      { status: 500 }
    );
  }
}
