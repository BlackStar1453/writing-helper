import { db } from './drizzle';
import { users } from './schema';
import { randomUUID } from 'crypto';

async function seed() {
  console.log('开始填充用户数据...');

  const email = 'test@test.com';
  const userId = randomUUID(); // Generate a proper UUID for the user

  const [user] = await db
    .insert(users)
    .values([
      {
        id: userId,
        email: email,
        name: '测试用户',
        role: "admin",
      },
    ])
    .returning();

  console.log('初始用户创建成功:', user);
  console.log('注意：此用户仅在本地数据库中创建。');
  console.log('要使用此用户登录，需要在 Supabase Auth 中创建对应的用户账户。');
}

seed()
  .catch((error) => {
    console.error('填充数据失败:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('填充数据完成。退出...');
    process.exit(0);
  });
