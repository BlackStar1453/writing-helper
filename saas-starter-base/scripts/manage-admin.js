#!/usr/bin/env node

/**
 * 管理员用户管理脚本
 * 用于设置和管理用户的管理员权限
 */

import { db } from '../lib/db/drizzle.js';
import { users } from '../lib/db/schema.js';
import { eq } from 'drizzle-orm';

const args = process.argv.slice(2);
const command = args[0];
const email = args[1];

async function listUsers() {
  console.log('📋 当前用户列表:');
  console.log('');
  
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        planName: users.planName,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(users.createdAt);

    if (allUsers.length === 0) {
      console.log('暂无用户');
      return;
    }

    console.log('ID'.padEnd(38) + 'Email'.padEnd(30) + 'Name'.padEnd(20) + 'Role'.padEnd(10) + 'Plan');
    console.log('-'.repeat(120));
    
    allUsers.forEach(user => {
      const id = user.id.slice(0, 8) + '...';
      const email = (user.email || '').padEnd(30);
      const name = (user.name || '未设置').padEnd(20);
      const role = (user.role || 'member').padEnd(10);
      const plan = user.planName || '无';
      
      console.log(`${id.padEnd(38)}${email}${name}${role}${plan}`);
    });
    
    console.log('');
    console.log(`总计: ${allUsers.length} 个用户`);
    
  } catch (error) {
    console.error('❌ 获取用户列表失败:', error.message);
  }
}

async function setAdmin(userEmail) {
  if (!userEmail) {
    console.error('❌ 请提供用户邮箱');
    return;
  }

  try {
    console.log(`🔧 正在将用户 ${userEmail} 设置为管理员...`);
    
    const [updatedUser] = await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.email, userEmail))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
      });

    if (!updatedUser) {
      console.error(`❌ 未找到邮箱为 ${userEmail} 的用户`);
      return;
    }

    console.log('✅ 管理员权限设置成功!');
    console.log('');
    console.log('用户信息:');
    console.log(`- ID: ${updatedUser.id}`);
    console.log(`- 邮箱: ${updatedUser.email}`);
    console.log(`- 姓名: ${updatedUser.name || '未设置'}`);
    console.log(`- 角色: ${updatedUser.role}`);
    
  } catch (error) {
    console.error('❌ 设置管理员权限失败:', error.message);
  }
}

async function removeAdmin(userEmail) {
  if (!userEmail) {
    console.error('❌ 请提供用户邮箱');
    return;
  }

  try {
    console.log(`🔧 正在移除用户 ${userEmail} 的管理员权限...`);
    
    const [updatedUser] = await db
      .update(users)
      .set({ role: 'member' })
      .where(eq(users.email, userEmail))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
      });

    if (!updatedUser) {
      console.error(`❌ 未找到邮箱为 ${userEmail} 的用户`);
      return;
    }

    console.log('✅ 管理员权限移除成功!');
    console.log('');
    console.log('用户信息:');
    console.log(`- ID: ${updatedUser.id}`);
    console.log(`- 邮箱: ${updatedUser.email}`);
    console.log(`- 姓名: ${updatedUser.name || '未设置'}`);
    console.log(`- 角色: ${updatedUser.role}`);
    
  } catch (error) {
    console.error('❌ 移除管理员权限失败:', error.message);
  }
}

function showHelp() {
  console.log('🛠️  管理员用户管理工具');
  console.log('');
  console.log('用法:');
  console.log('  node scripts/manage-admin.js <command> [email]');
  console.log('');
  console.log('命令:');
  console.log('  list                    - 列出所有用户');
  console.log('  set-admin <email>       - 将用户设置为管理员');
  console.log('  remove-admin <email>    - 移除用户的管理员权限');
  console.log('  help                    - 显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/manage-admin.js list');
  console.log('  node scripts/manage-admin.js set-admin user@example.com');
  console.log('  node scripts/manage-admin.js remove-admin user@example.com');
}

async function main() {
  console.log('🚀 启动管理员管理工具...');
  console.log('');

  switch (command) {
    case 'list':
      await listUsers();
      break;
    case 'set-admin':
      await setAdmin(email);
      break;
    case 'remove-admin':
      await removeAdmin(email);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error('❌ 未知命令:', command);
      console.log('');
      showHelp();
      process.exit(1);
  }
}

main()
  .catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
