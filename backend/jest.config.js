module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/src/tests/setupAfterEnv.js'],
    moduleDirectories: ['node_modules', 'src'],
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/fixtures/',
        '/tests/utils/'
    ],
    testPathIgnorePatterns: ['/node_modules/'],
    verbose: true
};