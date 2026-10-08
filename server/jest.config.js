export default {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  transform: {},
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/seed.js',
    '!src/config/**',
    '!src/models/**',
    '!src/mappers/**',
    '!src/repositories/mongoose/**',
    '!src/middleware/**',
    '!src/routes/**',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
