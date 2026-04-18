import { Router } from 'express';
import { checkTokenMiddleware, controllerHandler } from '@aure/commons';
import {
    deleteOrderAction,
    getOrderByIdAction,
    getOrdersAction,
    updateOrderAction,
} from '../controllers/orders.controller';

const router = Router();

router.get('/', checkTokenMiddleware, controllerHandler(getOrdersAction));
router.get('/:id', checkTokenMiddleware, controllerHandler(getOrderByIdAction));
router.put('/:id', checkTokenMiddleware, controllerHandler(updateOrderAction));
router.delete('/:id', checkTokenMiddleware, controllerHandler(deleteOrderAction));

export default router;
