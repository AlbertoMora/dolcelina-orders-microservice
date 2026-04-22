// test/unit/controllers/orders/orders.controller.test.js

// 1. All jest.mock() calls MUST come first (they are hoisted by Jest)
jest.mock('../../../../dist/services/sequelize-service', () => ({
    SequelizeService: { getInstance: jest.fn() },
}));

jest.mock('@aure/commons', () => ({
    httpCodes: { bad_request: 400, not_found: 404, ok: 200, conflict: 409, server_error: 500 },
    responseCodes: { ok: 'OK' },
    sendClientError: jest.fn(),
    sendOkResponse: jest.fn(),
    sendServerError: jest.fn(),
    avoidNanParseInt: jest.fn(v => parseInt(v) || 10),
    webErrors: { srv01: { code: 'srv01' }, srv02: { code: 'srv02' } },
}));

jest.mock('../../../../dist/constants/service-errors', () => ({
    serviceErrors: {
        ord01: { msg: 'Order not found', id: 'ord01' },
    },
}));

// 2. Require the module under test AFTER all mocks are declared
const {
    getOrdersAction,
    getOrderByIdAction,
    updateOrderAction,
    deleteOrderAction,
} = require('../../../../dist/controllers/orders.controller');
const {
    sendClientError,
    sendOkResponse,
    httpCodes,
    responseCodes,
    avoidNanParseInt,
} = require('@aure/commons');
const { SequelizeService } = require('../../../../dist/services/sequelize-service');
const { serviceErrors } = require('../../../../dist/constants/service-errors');

// 3. Test suite
describe('orders.controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getOrdersAction', () => {
        it('should return list of orders', async () => {
            const fakeOrders = [
                {
                    id: 'order-1',
                    email: 'user@test.com',
                    status: 'pending',
                    total: 150.0,
                    order_items: [],
                },
                {
                    id: 'order-2',
                    email: 'user2@test.com',
                    status: 'completed',
                    total: 250.0,
                    order_items: [],
                },
            ];

            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findAll: jest.fn().mockResolvedValue(fakeOrders),
                    },
                    order_item: {},
                },
            });

            const req = {
                query: {
                    orderField: 'created_at',
                    orderDirection: 'DESC',
                    limit: '10',
                    offset: '0',
                },
            };
            const res = {};

            await getOrdersAction(req, res);

            expect(sendOkResponse).toHaveBeenCalledWith(
                { status: responseCodes.ok, orders: fakeOrders },
                res,
            );
        });

        it('should filter orders by email', async () => {
            const fakeOrders = [
                {
                    id: 'order-1',
                    email: 'user@test.com',
                    status: 'pending',
                    total: 150.0,
                    order_items: [],
                },
            ];

            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findAll: jest.fn().mockResolvedValue(fakeOrders),
                    },
                    order_item: {},
                },
            });

            const req = {
                query: {
                    email: 'user@test.com',
                    limit: '10',
                    offset: '0',
                },
            };
            const res = {};

            await getOrdersAction(req, res);

            expect(sendOkResponse).toHaveBeenCalled();
        });

        it('should filter orders by status', async () => {
            const fakeOrders = [
                {
                    id: 'order-1',
                    status: 'completed',
                    total: 150.0,
                    order_items: [],
                },
            ];

            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findAll: jest.fn().mockResolvedValue(fakeOrders),
                    },
                    order_item: {},
                },
            });

            const req = {
                query: {
                    status: 'completed',
                    limit: '10',
                    offset: '0',
                },
            };
            const res = {};

            await getOrdersAction(req, res);

            expect(sendOkResponse).toHaveBeenCalled();
        });
    });

    describe('getOrderByIdAction', () => {
        it('should return order when found', async () => {
            const fakeOrder = {
                id: 'order-1',
                email: 'user@test.com',
                status: 'pending',
                total: 150.0,
                order_items: [],
                shipping_address: { id: 1, street: '123 Main St' },
            };

            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findByPk: jest.fn().mockResolvedValue(fakeOrder),
                    },
                    order_item: {},
                    address: {},
                },
            });

            const req = { params: { id: 'order-1' } };
            const res = {};

            await getOrderByIdAction(req, res);

            expect(sendOkResponse).toHaveBeenCalledWith(
                { status: responseCodes.ok, order: fakeOrder },
                res,
            );
        });

        it('should return not found when order does not exist', async () => {
            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findByPk: jest.fn().mockResolvedValue(null),
                    },
                    order_item: {},
                    address: {},
                },
            });

            const req = { params: { id: 'missing-id' } };
            const res = {};

            await getOrderByIdAction(req, res);

            expect(sendClientError).toHaveBeenCalledWith(
                serviceErrors.ord01,
                res,
                httpCodes.not_found,
            );
        });
    });

    describe('updateOrderAction', () => {
        it('should update order with valid data', async () => {
            const fakeOrder = {
                id: 'order-1',
                email: 'user@test.com',
                status: 'pending',
                total: 150.0,
                update: jest.fn().mockResolvedValue({
                    id: 'order-1',
                    email: 'newemail@test.com',
                    status: 'shipped',
                    total: 200.0,
                }),
            };

            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findByPk: jest.fn().mockResolvedValue(fakeOrder),
                    },
                },
            });

            const req = {
                params: { id: 'order-1' },
                body: { email: 'newemail@test.com', status: 'shipped', total: 200.0 },
            };
            const res = {};

            await updateOrderAction(req, res);

            expect(sendOkResponse).toHaveBeenCalled();
            expect(fakeOrder.update).toHaveBeenCalled();
        });

        it('should return not found when order does not exist', async () => {
            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findByPk: jest.fn().mockResolvedValue(null),
                    },
                },
            });

            const req = {
                params: { id: 'missing-id' },
                body: { email: 'newemail@test.com' },
            };
            const res = {};

            await updateOrderAction(req, res);

            expect(sendClientError).toHaveBeenCalledWith(
                serviceErrors.ord01,
                res,
                httpCodes.not_found,
            );
        });

        it('should update only provided fields', async () => {
            const mockUpdate = jest.fn().mockResolvedValue({ id: 'order-1', status: 'shipped' });
            const fakeOrder = {
                id: 'order-1',
                update: mockUpdate,
            };

            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findByPk: jest.fn().mockResolvedValue(fakeOrder),
                    },
                },
            });

            const req = {
                params: { id: 'order-1' },
                body: { status: 'shipped' },
            };
            const res = {};

            await updateOrderAction(req, res);

            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'shipped' }));
        });
    });

    describe('deleteOrderAction', () => {
        it('should delete order when found', async () => {
            const mockDestroy = jest.fn().mockResolvedValue(true);
            const fakeOrder = {
                id: 'order-1',
                destroy: mockDestroy,
            };

            const mockOrderItemDestroy = jest.fn().mockResolvedValue(1);

            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findByPk: jest.fn().mockResolvedValue(fakeOrder),
                    },
                    order_item: {
                        destroy: mockOrderItemDestroy,
                    },
                },
            });

            const req = { params: { id: 'order-1' } };
            const res = {};

            await deleteOrderAction(req, res);

            expect(mockOrderItemDestroy).toHaveBeenCalled();
            expect(mockDestroy).toHaveBeenCalled();
            expect(sendOkResponse).toHaveBeenCalledWith({ status: responseCodes.ok }, res);
        });

        it('should return not found when order does not exist', async () => {
            SequelizeService.getInstance.mockResolvedValue({
                db: {
                    order: {
                        findByPk: jest.fn().mockResolvedValue(null),
                    },
                    order_item: {},
                },
            });

            const req = { params: { id: 'missing-id' } };
            const res = {};

            await deleteOrderAction(req, res);

            expect(sendClientError).toHaveBeenCalledWith(
                serviceErrors.ord01,
                res,
                httpCodes.not_found,
            );
        });
    });
});
