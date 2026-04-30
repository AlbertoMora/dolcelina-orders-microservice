import { Router } from 'express';
import { controllerHandler } from '@amora95/commons';
import {
    addItemAction,
    completePaymentAction,
    createPaymentIntentAction,
    deleteItemAction,
    getCartAction,
} from '../controllers/cart.controller';

const router = Router();

router.get('/:cartId', controllerHandler(getCartAction));
router.post('/item/', controllerHandler(addItemAction));
router.delete('/item/', controllerHandler(deleteItemAction));
router.post('/payment-intent/', controllerHandler(createPaymentIntentAction));
router.post('/complete-payment/', controllerHandler(completePaymentAction));

export default router;
