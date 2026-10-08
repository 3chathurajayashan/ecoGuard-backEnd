export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.js"],
  testMatch: ["**/__tests__/**/*.test.js"],
  transform: {},
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/"
  ]
};
