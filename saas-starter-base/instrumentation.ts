/**
 * Next.js Instrumentation API
 * 这是 Next.js 官方推荐的服务器初始化入口点
 * 在服务器启动时自动执行，只执行一次
 */

export async function register() {
  // 记录环境信息
  console.log('🔍 [Instrumentation] 环境检查:', {
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    PRECACHE_ACTIVE_USERS: process.env.PRECACHE_ACTIVE_USERS,
  });

  // 只在服务器环境执行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 [Instrumentation] 开始服务器初始化...');

    try {
      // 暂时禁用服务器预热，直接跳过
      console.log('⏭️ [Instrumentation] 暂时跳过服务器预热，避免卡住问题');

      // 注释掉预热逻辑
      // const { initializeServer } = await import('./lib/server-init');
      // await initializeServer();

      console.log('✅ [Instrumentation] 服务器初始化完成（跳过预热）');
    } catch (error) {
      console.error('❌ [Instrumentation] 服务器初始化失败:', error);
      // 不抛出错误，允许服务器继续启动
    }
  } else {
    console.log('⏭️ [Instrumentation] 跳过非 Node.js 运行时:', process.env.NEXT_RUNTIME);
  }
}
