// Jest setup file

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/test';

// 增加测试超时时间
jest.setTimeout(60000);

// 全局测试设置
beforeAll(async () => {
  console.log('🚀 开始测试套件');
});

afterAll(async () => {
  console.log('✅ 测试套件完成');
});
