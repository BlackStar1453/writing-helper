// Jest configuration
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/app/_test_/**/*.test.ts'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 60000, // 60秒超时，因为我们需要测试数据库操作
  verbose: true,
  collectCoverageFrom: [
    'lib/**/*.{js,ts}',
    'src/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ]
}
