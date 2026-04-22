// jest.config.js
module.exports = {
    projects: [
        {
            displayName: 'unit',
            testEnvironment: 'node',
            roots: ['<rootDir>/test/unit'],
            testMatch: ['**/*.test.js'],
            clearMocks: true,
            collectCoverageFrom: [
                'dist/controllers/**/*.js',
                'dist/services/**/*.js',
                'dist/utils/**/*.js',
                'dist/constants/**/*.js',
                '!dist/**/*.test.js',
                '!dist/models/mariadb/**',
                '!dist/config/**',
            ],
            coveragePathIgnorePatterns: ['/node_modules/', '/dist/models/mariadb/'],
            coverageThreshold: {
                global: {
                    statements: 70,
                    branches: 50,
                    functions: 50,
                    lines: 70,
                },
            },
        },
        {
            displayName: 'integration',
            testEnvironment: 'node',
            roots: ['<rootDir>/test/integration'],
            testMatch: ['**/*.test.js'],
            clearMocks: true,
        },
    ],
};
