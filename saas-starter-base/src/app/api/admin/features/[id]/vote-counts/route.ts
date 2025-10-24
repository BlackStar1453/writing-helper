import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { features, featureVotes, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { adminMiddleware } from '@/lib/auth/admin';

// 批量设置投票数量
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(request);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const { id } = await params;
    const body = await request.json();
    const { likesCount, dislikesCount } = body;

    // 验证输入
    if (typeof likesCount !== 'number' || typeof dislikesCount !== 'number' ||
        likesCount < 0 || dislikesCount < 0 ||
        !Number.isInteger(likesCount) || !Number.isInteger(dislikesCount)) {
      return NextResponse.json(
        { success: false, error: '投票数量必须为非负整数' },
        { status: 400 }
      );
    }

    // 验证功能是否存在
    const feature = await db
      .select()
      .from(features)
      .where(eq(features.id, id))
      .limit(1)
      .then(rows => rows[0]);

    if (!feature) {
      return NextResponse.json(
        { success: false, error: '功能不存在' },
        { status: 404 }
      );
    }

    // 获取当前投票情况
    const currentVotes = await db
      .select({
        id: featureVotes.id,
        voteType: featureVotes.voteType,
        userId: featureVotes.userId,
      })
      .from(featureVotes)
      .where(eq(featureVotes.featureId, id));

    const currentLikes = currentVotes.filter(v => v.voteType === 'like').length;
    const currentDislikes = currentVotes.filter(v => v.voteType === 'dislike').length;

    // 计算需要调整的数量
    const likeDiff = likesCount - currentLikes;
    const dislikeDiff = dislikesCount - currentDislikes;

    // 开始事务处理
    await db.transaction(async (tx) => {
      console.log('开始设置投票数量:', { id, likesCount, dislikesCount });

      // 先删除所有现有投票
      await tx.delete(featureVotes).where(eq(featureVotes.featureId, id));
      console.log('已删除现有投票');

      // 获取现有用户
      const existingUsers = await tx
        .select({ id: users.id })
        .from(users);

      console.log('现有用户数量:', existingUsers.length);

      // 计算需要的总投票数
      const totalVotesNeeded = likesCount + dislikesCount;
      console.log('需要的总投票数:', totalVotesNeeded);

      // 如果现有用户不够，创建虚拟用户
      const neededUsers = Math.max(0, totalVotesNeeded - existingUsers.length);
      console.log('需要创建的虚拟用户数:', neededUsers);

      const virtualUsers = [];

      for (let i = 0; i < neededUsers; i++) {
        const virtualUserId = crypto.randomUUID();
        console.log(`创建虚拟用户 ${i + 1}:`, virtualUserId);

        const virtualUser = await tx.insert(users).values({
          id: virtualUserId,
          email: `virtual_voter_${Date.now()}_${i}@system.local`,
          name: `Virtual Voter ${i + 1}`,
          role: 'member',
          planName: 'Premium',
        }).returning({ id: users.id });

        virtualUsers.push(virtualUser[0]);
        console.log('虚拟用户创建成功:', virtualUser[0]);
      }

      // 合并所有可用用户
      const allAvailableUsers = [...existingUsers, ...virtualUsers];
      console.log('总可用用户数:', allAvailableUsers.length);

      // 创建指定数量的like投票
      for (let i = 0; i < likesCount; i++) {
        await tx.insert(featureVotes).values({
          featureId: id,
          userId: allAvailableUsers[i].id,
          voteType: 'like',
        });
        console.log(`创建like投票 ${i + 1}`);
      }

      // 创建指定数量的dislike投票
      for (let i = 0; i < dislikesCount; i++) {
        await tx.insert(featureVotes).values({
          featureId: id,
          userId: allAvailableUsers[likesCount + i].id,
          voteType: 'dislike',
        });
        console.log(`创建dislike投票 ${i + 1}`);
      }

      console.log('事务处理完成');
    });

    return NextResponse.json({
      success: true,
      message: '投票数量更新成功',
      data: {
        featureId: id,
        likesCount,
        dislikesCount,
        changes: {
          likeDiff,
          dislikeDiff
        }
      }
    });

  } catch (error) {
    console.error('更新投票数量失败:', error);
    return NextResponse.json(
      { success: false, error: '更新投票数量失败' },
      { status: 500 }
    );
  }
}
