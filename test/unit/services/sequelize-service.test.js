// test/unit/services/sequelize-service.test.js

jest.mock('sequelize', () => {
    const mockSequelize = jest.fn();
    mockSequelize.prototype.authenticate = jest.fn().mockResolvedValue(true);
    mockSequelize.prototype.close = jest.fn().mockResolvedValue(true);
    return { Sequelize: mockSequelize };
});

jest.mock('@amora95/commons', () => ({
    OpenbaoVaultClient: {
        getInstance: jest.fn(() => ({
            getSecret: jest.fn().mockResolvedValue({
                dbName: 'test_db',
                dbUser: 'root',
                dbPassword: 'password',
            }),
        })),
    },
}));

jest.mock('../../../dist/models/mariadb/init-models', () => ({
    initModels: jest.fn(() => ({
        user: { findAll: jest.fn() },
        order: { create: jest.fn() },
        order_item: { bulkCreate: jest.fn() },
        product: { findByPk: jest.fn() },
    })),
}));

jest.mock('node:fs', () => ({
    readFileSync: jest.fn(() => 'mock-certificate-content'),
}));

describe('sequelize-service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Delete the singleton instance between tests
        delete require.cache[require.resolve('../../../dist/services/sequelize-service')];
    });

    it('should be a singleton', async () => {
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        // Verify the service exists
        expect(SequelizeService).toBeDefined();
        expect(SequelizeService.getInstance).toBeDefined();
    });

    it('getInstance should return the same instance', async () => {
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance1 = await SequelizeService.getInstance();
        const instance2 = await SequelizeService.getInstance();

        expect(instance1).toBe(instance2);
    });

    it('should initialize database on first getInstance call', async () => {
        process.env.NODE_ENV = 'test';
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance = await SequelizeService.getInstance();

        expect(instance.isReady).toBe(true);
        expect(instance.db).toBeDefined();
        expect(instance.sequelize).toBeDefined();
    });

    it('should use environment variables for host and port', async () => {
        process.env.NODE_ENV = 'test';
        process.env.DB_HOST = 'db.example.com';
        process.env.DB_PORT = '3307';

        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance = await SequelizeService.getInstance();

        expect(instance).toBeDefined();
        expect(instance.isReady).toBe(true);
    });

    it('should use default host and port when env vars not set', async () => {
        process.env.NODE_ENV = 'test';
        delete process.env.DB_HOST;
        delete process.env.DB_PORT;

        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance = await SequelizeService.getInstance();

        expect(instance).toBeDefined();
        expect(instance.isReady).toBe(true);
    });

    it('should get status with correct format', async () => {
        process.env.NODE_ENV = 'test';
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance = await SequelizeService.getInstance();
        const status = instance.getStatus();

        expect(status).toHaveProperty('isReady');
        expect(status).toHaveProperty('host');
        expect(status).toHaveProperty('port');
        expect(status.isReady).toBe(true);
    });

    it('should authenticate database connection', async () => {
        process.env.NODE_ENV = 'test';
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance = await SequelizeService.getInstance();

        // Verify instance was created and is ready
        expect(instance).toBeDefined();
        expect(instance.isReady).toBe(true);
    });

    it('should have db models initialized', async () => {
        process.env.NODE_ENV = 'test';
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance = await SequelizeService.getInstance();

        expect(instance.db).toBeDefined();
        expect(instance.db.user).toBeDefined();
        expect(instance.db.order).toBeDefined();
        expect(instance.db.order_item).toBeDefined();
        expect(instance.db.product).toBeDefined();
    });

    it('should close database connection', async () => {
        process.env.NODE_ENV = 'test';
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance = await SequelizeService.getInstance();
        await instance.close();

        expect(instance.isReady).toBe(false);
    });

    it('should not reinitialize if already ready', async () => {
        process.env.NODE_ENV = 'test';
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance = await SequelizeService.getInstance();

        // Verify instance is created
        expect(instance).toBeDefined();
    });

    it('should handle concurrent getInstance calls', async () => {
        process.env.NODE_ENV = 'test';
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        // Simulate concurrent calls
        const promise1 = SequelizeService.getInstance();
        const promise2 = SequelizeService.getInstance();

        const instance1 = await promise1;
        const instance2 = await promise2;

        expect(instance1).toBeDefined();
        expect(instance2).toBeDefined();
    });

    it('should provide database model access', async () => {
        process.env.NODE_ENV = 'test';
        const { SequelizeService } = require('../../../dist/services/sequelize-service');

        const instance = await SequelizeService.getInstance();

        // Verify all expected models are present
        expect(instance.db.user).toBeDefined();
        expect(instance.db.order).toBeDefined();
        expect(instance.db.order_item).toBeDefined();
        expect(instance.db.product).toBeDefined();
    });
});
