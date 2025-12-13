/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: 'src',
    testMatch: ['**/__tests__/**/*.test.ts'],
    verbose: true,
    forceExit: true, // often upgrades needed for BullMQ/Redis handle cleanup
};
