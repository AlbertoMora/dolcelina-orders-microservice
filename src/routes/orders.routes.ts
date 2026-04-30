import { Router } from 'express';
import { checkTokenMiddleware, controllerHandler } from '@amora95/commons';
import {
    deleteOrderAction,
    getOrderByIdAction,
    getOrdersAction,
    setOrderNextStateAction,
    updateOrderAction,
} from '../controllers/orders.controller';

const router = Router();

router.get('/', checkTokenMiddleware, controllerHandler(getOrdersAction));
router.get('/:id', checkTokenMiddleware, controllerHandler(getOrderByIdAction));
router.put('/:id', checkTokenMiddleware, controllerHandler(updateOrderAction));
router.put('/:id/next-state', checkTokenMiddleware, controllerHandler(setOrderNextStateAction));
router.delete('/:id', checkTokenMiddleware, controllerHandler(deleteOrderAction));

export default router;
