import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// 优化数据库连接配置
export const client = postgres(process.env.POSTGRES_URL, {
  // 连接池配置 - 增加连接数以应对并发查询
  max: 20,                    // 最大连接数（从10增加到20）
  idle_timeout: 30,           // 空闲连接超时时间(秒)
  connect_timeout: 15,        // 连接超时时间(秒)（从10增加到15）

  // 查询超时配置
  prepare: false,             // 禁用预处理语句以提高兼容性
  transform: {
    undefined: null,          // 将 undefined 转换为 null
  },

  // 连接配置
  onnotice: () => {},         // 忽略 PostgreSQL 通知

  // 调试配置（开发环境）
  debug: process.env.NODE_ENV === 'development' ? (_connection, query, parameters) => {
    console.log('[DB Debug] Query:', query);
    if (parameters?.length) {
      console.log('[DB Debug] Parameters:', parameters);
    }
  } : false,

  // 错误处理
  onparameter: (key, value) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB] Parameter ${key}:`, value);
    }
  },

  // SSL 配置（生产环境通常需要）
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(client, { 
  schema,
  // 添加日志记录
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query, params) => {
      console.log('[Drizzle] SQL:', query);
      if (params?.length) {
        console.log('[Drizzle] Params:', params);
      }
    }
  } : false
});

// 健康检查函数
export async function checkDatabaseConnection() {
  try {
    const start = Date.now();
    await client`SELECT 1 as test`;
    const duration = Date.now() - start;
    console.log(`[DB] Health check passed in ${duration}ms`);
    return { healthy: true, duration };
  } catch (error) {
    console.error('[DB] Health check failed:', error);
    return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 优雅关闭函数
export async function closeDatabaseConnection() {
  try {
    await client.end();
    console.log('[DB] Connection closed gracefully');
  } catch (error) {
    console.error('[DB] Error closing connection:', error);
  }
}

// 在进程退出时清理连接
if (typeof process !== 'undefined') {
  process.on('SIGINT', closeDatabaseConnection);
  process.on('SIGTERM', closeDatabaseConnection);
  process.on('beforeExit', closeDatabaseConnection);
}
