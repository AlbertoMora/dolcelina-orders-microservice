// test/integration/config/route-config.test.js

jest.mock('../../../dist/routes/cart.routes', () => ({
    __esModule: true,
    default: jest.fn(app => {
        app.use('/cart', jest.fn());
    }),
}));

jest.mock('../../../dist/routes/orders.routes', () => ({
    __esModule: true,
    default: jest.fn(app => {
        app.use('/orders', jest.fn());
    }),
}));

const { setRoutesConfig } = require('../../../dist/config/route-config');

describe('setRoutesConfig', () => {
    it('should mount route modules', () => {
        const useSpy = jest.fn();
        const app = { use: useSpy };

        setRoutesConfig(app);

        // Verify that app.use was called (routes were mounted)
        expect(useSpy).toHaveBeenCalled();
    });

    it('should be callable without errors', () => {
        const app = { use: jest.fn() };

        expect(() => {
            setRoutesConfig(app);
        }).not.toThrow();
    });
});
