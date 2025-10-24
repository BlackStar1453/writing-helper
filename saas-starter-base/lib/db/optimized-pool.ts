import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 优化的连接池配置
const connectionString = process.env.DATABASE_URL!;

// 创建优化的连接池
const sql = postgres(connectionString, {
  // 连接池配置
  max: 20,                    // 最大连接数
  idle_timeout: 20,           // 空闲超时时间（秒）
  connect_timeout: 10,        // 连接超时时间（秒）
  
  // 性能优化
  prepare: true,              // 启用预处理语句
  transform: {
    undefined: null,          // 将 undefined 转换为 null
  },
  
  // 连接复用
  connection: {
    application_name: 'saas-starter-optimized',
  },
  
  // 错误处理
  onnotice: () => {},         // 忽略通知
  debug: process.env.NODE_ENV === 'development',
});

// 创建优化的 Drizzle 实例
export const optimizedDb = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// 连接池状态监控
export function getPoolStats() {
  return {
    totalConnections: sql.options.max || 20,
    // 注意：postgres.js 不直接暴露连接池状态
    // 这里提供基本的配置信息
    maxConnections: sql.options.max || 20,
    idleTimeout: sql.options.idle_timeout || 20,
    connectTimeout: sql.options.connect_timeout || 10,
  };
}

// 优雅关闭连接池
export async function closePool() {
  await sql.end();
}

// 健康检查
export async function healthCheck(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    return false;
  }
}
