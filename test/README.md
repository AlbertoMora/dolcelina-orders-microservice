# Testing Guide - Orders Microservice

This document describes the Jest testing setup for the orders-microservice.

## Quick Start

```bash
# Run all tests (unit + integration)
yarn test

# Run unit tests only
yarn test:unit

# Run unit tests with coverage report
yarn test:unit:coverage

# Run integration tests only
yarn test:integration

# Watch mode (reruns on file save, unit tests only)
yarn test:watch
```

## Test Structure

```
test/
├── unit/
│   ├── constants/
│   ├── utils/
│   ├── controllers/
│   │   ├── cart/
│   │   └── orders/
│   └── services/
└── integration/
    └── config/
```

The `unit/` folder mirrors the `src/` structure for easy test location.

## Configuration

- **jest.config.js** — Main Jest configuration with two project profiles: unit and integration
- **package.json scripts** — Defined test commands with proper NODE_ENV handling
- **src/index.ts** — Bootstraps only when not in test mode

## Key Setup Details

### 1. Test Environment Variable

All test commands set `NODE_ENV=test` to prevent database/Redis connections during testing.

### 2. Compilation Before Tests

Tests are run against compiled JavaScript in `dist/`. The build step runs before any test:

```bash
yarn build && jest --runInBand
```

### 3. Mock Patterns

All tests import from compiled `dist/` paths. Mocks must point to `dist/`:

```js
jest.mock('../../../../dist/services/sequelize-service', () => ({
    SequelizeService: { getInstance: jest.fn() },
}));
```

### 4. Common Mocks

**@aure/commons:**

```js
jest.mock('@aure/commons', () => ({
    httpCodes: { ok: 200, bad_request: 400, not_found: 404, server_error: 500 },
    responseCodes: { ok: 'OK' },
    sendClientError: jest.fn(),
    sendOkResponse: jest.fn(),
    sendServerError: jest.fn(),
    webErrors: {
        /* your error codes */
    },
}));
```

**Sequelize Service:**

```js
jest.mock('../../../../dist/services/sequelize-service', () => ({
    SequelizeService: { getInstance: jest.fn() },
}));
```

**Redis Client:**

```js
jest.mock('../../../../dist/config/db-config', () => ({
    redisClient: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));
```

**Webclient Helper:**

```js
jest.mock('../../../../dist/utils/webclient-helper', () => ({
    getBasicWebData: jest.fn(() => ({
        userIp: '127.0.0.1',
        userOs: 'test-os',
        userAgent: 'test-agent',
    })),
}));
```

**Mongoose Models (with \_\_esModule for default exports):**

```js
jest.mock('../../../../dist/models/mongoose/Session', () => ({
    __esModule: true,
    default: {
        findById: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
    },
}));
```

## Writing a Unit Test

See template in:

- [test/unit/controllers/cart/cart.controller.test.js](./unit/controllers/cart/cart.controller.test.js)
- [test/unit/controllers/orders/orders.controller.test.js](./unit/controllers/orders/orders.controller.test.js)

Key points:

1. All `jest.mock()` calls must come first (hoisted by Jest)
2. Require the module under test after all mocks
3. Use `beforeEach` to clear mocks between tests
4. Mock all external dependencies (DB, Redis, HTTP helpers)

## Writing an Integration Test

See template in:

- [test/integration/config/route-config.test.js](./integration/config/route-config.test.js)

Integration tests verify route mounting and middleware wiring without starting the real server.

## Common Issues & Fixes

| Issue                                           | Cause                                              | Fix                                                                   |
| ----------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| `ConnectionTimeoutError` during tests           | Bootstrap ran despite NODE_ENV guard               | Ensure src/index.ts has the `NODE_ENV !== 'test'` guard               |
| `jest.mock variable used before initialization` | Variable in mock factory doesn't start with `mock` | Rename to start with `mock` (e.g., `mockGetSecret`)                   |
| Module not found: `dist/...`                    | TypeScript not compiled                            | Run `yarn build` first, or use `yarn test` which builds automatically |
| `__esModule` errors on default exports          | Mock missing `__esModule: true` flag               | Add `__esModule: true` to Mongoose/route module mocks                 |
| Timeout errors in tests                         | Real connections attempted                         | Add all necessary mocks before requiring module under test            |

## Coverage Report

**Current Status:** 63.49% overall (28 tests passing, 4 test suites)

| Layer             | Coverage | Tests | Status             |
| ----------------- | -------- | ----- | ------------------ |
| orders.controller | 92.95%   | 16    | ✅ Excellent       |
| cart.controller   | 58.99%   | 8     | ⚠️ Good foundation |
| geo-helper        | 100%     | 4     | ✅ Perfect         |
| secrets-constants | 100%     | —     | ✅ Perfect         |
| sequelize-service | 15%      | 2     | ❌ Complex mocks   |

**Coverage Targets:**

- `controllers/`: ≥ 95% statements, ≥ 95% branches
- `utils/`: ≥ 90% statements, ≥ 90% branches
- `services/`: ≥ 90% statements, ≥ 90% branches
- `models/mariadb/`: skip (auto-generated)

## To Reach 90% Coverage (from 63%)

### Priority 1: Cart Controller Payment Functions (+20%)

The cart controller's payment processing functions (`createPaymentIntentAction`,
`completePaymentAction`) are currently untested. These require:

1. **Mock Stripe SDK:**

```js
jest.mock('stripe', () =>
    jest.fn(() => ({
        paymentIntents: {
            create: jest.fn().mockResolvedValue({ client_secret: 'pi_test' }),
            confirm: jest.fn().mockResolvedValue({ status: 'succeeded' }),
        },
    })),
);
```

2. **Test payment intent creation**
3. **Test payment completion with order persistence**
4. **Handle payment failures and edge cases**

### Priority 2: Sequelize Service (+10%)

- Mock database connection pool
- Test getInstance() singleton pattern
- Mock order and order_item model operations

### Priority 3: Additional Utilities (+5%)

- mail-helper: Email sending functions
- text-helper: String manipulation
- session-helper: JWT token operations

## Next Steps

1. Run `yarn test:unit:coverage` to see current coverage
2. Add Stripe SDK mocking for cart payment tests
3. Implement sequelize-service advanced tests
4. Expand utility test coverage
5. Target 70%+ (14% gain) then stretch to 90%
