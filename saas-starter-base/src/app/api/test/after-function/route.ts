import { NextRequest, NextResponse } from 'next/server';

/**
 * 测试 API 端点：验证 after 函数是否正确工作
 * 这个端点会测试后台任务的执行情况
 */
export async function GET(request: NextRequest) {
  const testId = Date.now().toString();
  console.log(`🧪 [Test-${testId}] 开始测试 after 函数`);

  // 创建一个简单的测试结果存储
  const testResults: any = {
    testId,
    timestamp: new Date().toISOString(),
    afterFunctionAvailable: false,
    waitUntilAvailable: false,
    backgroundTaskExecuted: false,
    method: 'none'
  };

  try {
    // 方法 1: 测试 Next.js 15+ 的 after 函数
    try {
      const { after } = await import('next/server');
      testResults.afterFunctionAvailable = true;
      console.log(`✅ [Test-${testId}] after 函数导入成功`);
      
      // 执行后台任务测试
      after(async () => {
        console.log(`🚀 [Test-${testId}] after 函数后台任务开始执行`);
        
        // 模拟一些异步工作
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`✅ [Test-${testId}] after 函数后台任务执行完成`);
        
        // 注意：这里无法直接修改 testResults，因为响应已经发送
        // 但我们可以通过日志验证执行情况
      });
      
      testResults.method = 'after';
      testResults.backgroundTaskExecuted = true; // 假设会执行
      
    } catch (afterError) {
      console.warn(`⚠️ [Test-${testId}] after 函数不可用:`, afterError);
      
      // 方法 2: 测试 Vercel 的 waitUntil 函数
      try {
        const RequestContext = (globalThis as any)[Symbol.for('@next/request-context')];
        const contextValue = RequestContext?.get();
        const waitUntil = contextValue?.waitUntil;
        
        if (waitUntil && typeof waitUntil === 'function') {
          testResults.waitUntilAvailable = true;
          console.log(`✅ [Test-${testId}] waitUntil 函数可用`);
          
          // 执行后台任务测试
          waitUntil((async () => {
            console.log(`🚀 [Test-${testId}] waitUntil 后台任务开始执行`);
            
            // 模拟一些异步工作
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log(`✅ [Test-${testId}] waitUntil 后台任务执行完成`);
          })());
          
          testResults.method = 'waitUntil';
          testResults.backgroundTaskExecuted = true; // 假设会执行
          
        } else {
          console.warn(`⚠️ [Test-${testId}] waitUntil 函数不可用`);
        }
      } catch (waitUntilError) {
        console.error(`❌ [Test-${testId}] waitUntil 测试失败:`, waitUntilError);
      }
    }

    // 返回测试结果
    const response = {
      success: true,
      message: '后台任务测试完成',
      testResults,
      instructions: [
        '1. 检查服务器日志以确认后台任务是否执行',
        '2. 如果 method 为 "none"，说明两种方法都不可用',
        '3. 如果 method 为 "after" 或 "waitUntil"，检查日志中的执行确认消息'
      ],
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelUrl: process.env.VERCEL_URL || 'localhost',
        isVercel: !!process.env.VERCEL,
        nextVersion: process.env.npm_package_dependencies_next || 'unknown'
      }
    };

    console.log(`📊 [Test-${testId}] 测试结果:`, JSON.stringify(testResults, null, 2));
    
    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error(`❌ [Test-${testId}] 测试过程中发生错误:`, error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: '测试执行失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      testResults
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * POST 方法：测试带参数的后台任务
 */
export async function POST(request: NextRequest) {
  const testId = Date.now().toString();
  console.log(`🧪 [Test-POST-${testId}] 开始测试带参数的 after 函数`);

  try {
    const body = await request.json();
    const { message = 'Hello from background task', delay = 500 } = body;

    // 测试 after 函数
    try {
      const { after } = await import('next/server');
      
      after(async () => {
        console.log(`🚀 [Test-POST-${testId}] 后台任务开始，消息: ${message}`);
        
        // 模拟延迟工作
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`✅ [Test-POST-${testId}] 后台任务完成，延迟: ${delay}ms`);
      });

      return NextResponse.json({
        success: true,
        message: '带参数的后台任务已启动',
        testId,
        parameters: { message, delay }
      });

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'after 函数不可用',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error(`❌ [Test-POST-${testId}] 测试失败:`, error);
    
    return NextResponse.json({
      success: false,
      error: '请求处理失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
