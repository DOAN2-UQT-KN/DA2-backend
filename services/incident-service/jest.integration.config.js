/** @type {import('ts-jest').JestConfigWithTsJest} */
// Integration tests: spin up a throwaway Postgres+PostGIS via Testcontainers,
// run prisma migrations, then exercise the outbox end-to-end against a real DB
// and a real (in-process) reward-service HTTP mock. Run with: npm run test:it
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__it__/**/*.it.test.ts"],
  clearMocks: true,
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
  // One container shared across the run; serialize suites so they don't fight
  // over the same tables.
  globalSetup: "<rootDir>/src/__it__/setup/global-setup.ts",
  globalTeardown: "<rootDir>/src/__it__/setup/global-teardown.ts",
  setupFiles: ["<rootDir>/src/__it__/setup/load-env.ts"],
  testTimeout: 120_000,
  maxWorkers: 1,
};
