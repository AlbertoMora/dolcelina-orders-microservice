import { Request, Response } from 'express';
import Cart, { ICartItem } from '../models/mongoose/Cart';
import {
    httpCodes,
    OpenbaoVaultClient,
    responseCodes,
    sendClientError,
    sendOkResponse,
} from '@amora95/commons';
import { serviceErrors } from '../constants/service-errors';
import moment from 'moment';
import { getUserSession } from '../utils/session-helper';
import { ICompletePaymentViewModel } from '../viewmodels/orders.viewmodels';
import { SequelizeService } from '../services/sequelize-service';
import {
    orderStates,
    payment_methods,
    stripePaymentIntents,
    unknownState,
} from '../constants/orders-constants';
import { stripeSecretKey } from '../constants/secrets-contants';
import stripe from 'stripe';
import { order } from '../models/mariadb/order';

export const addItemAction = async (req: Request, res: Response) => {
    const { item, cartId } = req.body;

    const token = req.headers.authorization;

    const { cart, email } = await getCart(cartId ?? unknownState, token);

    if (!cart) {
        const newCart = new Cart({
            email,
            items: [{ ...item }],
            createdAt: moment().utc().toDate(),
            updatedAt: moment().utc().toDate(),
        });
        await newCart.save();

        const responseBody = { status: responseCodes.ok, cart: newCart.toObject() };
        return res.status(201).json(responseBody);
    }

    const isNew = !cart.items.some(i => i.id === item.id);

    if (isNew) {
        cart.items.push(item);
    } else {
        cart.items = cart.items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
    }

    cart.updatedAt = moment().utc().toDate();
    await cart.save();

    const responseBody = {
        status: responseCodes.ok,
        cart: cart.toObject(),
        updatedAt: moment().utc().toDate(),
    };

    return sendOkResponse(responseBody, res);
};

export const deleteItemAction = async (req: Request, res: Response) => {
    const { item, cartId } = req.body;
    const token = req.headers.authorization;

    const { cart } = await getCart(cartId ?? unknownState, token);

    if (!cart) {
        return sendClientError(serviceErrors.crt01, res, httpCodes.not_found);
    }

    const shoudlDelete = cart.items.some(i => i.id === item.id && i.quantity === 1);
    if (shoudlDelete) {
        const updatedItems = cart.items.filter(i => i.id !== item.id);
        cart.items = updatedItems;
    } else {
        cart.items = cart.items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i,
        );
    }

    cart.updatedAt = moment().utc().toDate();
    await cart.save();

    const responseBody = { status: responseCodes.ok, cart: cart.toObject() };

    return sendOkResponse(responseBody, res);
};

export const getCartAction = async (req: Request<{ cartId: string }>, res: Response) => {
    const { cartId } = req.params;
    const token = req.headers.authorization;
    const { cart } = await getCart(cartId, token);
    if (!cart) {
        return sendClientError(serviceErrors.crt01, res, httpCodes.not_found);
    }

    const responseBody = { status: responseCodes.ok, cart: cart.toObject() };
    return sendOkResponse(responseBody, res);
};

export const getCart = async (cartId?: string, token?: string) => {
    const session = getUserSession(token ?? '');
    if (cartId === unknownState && !session) return { cart: null, email: '', userId: '' };
    let email = '';
    if (session) email = session.user.id;

    const or = [];
    if (email) or.push({ email });
    if (cartId && cartId !== unknownState && !email) or.push({ _id: cartId });

    const cart = await Cart.findOne({ $or: or });
    return { cart, email, userId: session?.user.id };
};

export const createPaymentIntentAction = async (
    req: Request<{}, {}, ICompletePaymentViewModel, {}>,
    res: Response,
) => {
    const { cart_id } = req.body;
    const token = req.headers.authorization;
    const { cart, userId, email } = await getCart(cart_id ?? unknownState, token);
    if (!cart) return sendClientError(serviceErrors.crt01, res, httpCodes.not_found);

    const amount = cart.items.reduce((acc, item) => acc + (item.price ?? 0) * item.quantity, 0);

    const { sk } = await OpenbaoVaultClient.getInstance().getSecret<{ pk: string; sk: string }>(
        stripeSecretKey,
    );

    const paymentIntent = await createStripePaymentIntent(amount, cart.id, email, sk, userId);

    if (!paymentIntent) {
        return sendClientError(serviceErrors.pay04, res, httpCodes.server_error);
    }

    return sendOkResponse({ status: responseCodes.ok, clientSecret: paymentIntent }, res);
};

export const completePaymentAction = async (
    req: Request<{}, {}, ICompletePaymentViewModel, {}>,
    res: Response,
) => {
    const { payment_id, sinpe_url, cart_id, address } = req.body;

    const token = req.headers.authorization;
    const { cart, email } = await getCart(cart_id ?? unknownState, token);

    if (!cart) return sendClientError(serviceErrors.crt01, res, httpCodes.not_found);

    const sequelize = await SequelizeService.getInstance();

    const add = await getOrCreateAddress(address, sequelize);
    if (!add) {
        return sendClientError(serviceErrors.ord02, res, httpCodes.server_error);
    }

    const newOrder = await sequelize.db.order.create({
        id: crypto.randomUUID(),
        email: email ?? '',
        total: cart.items.reduce((acc, item) => acc + (item.price ?? 0) * item.quantity, 0),
        status: orderStates.pending,
        shipping_address_id: add.id,
        payment_method: payment_id ? payment_methods.credit_card : payment_methods.sinpe,
        created_at: moment().utc().toDate(),
        last_modified: moment().utc().toDate(),
    });

    const newOrderItems = await createOrderItems(cart.items, newOrder.id, sequelize);

    const isPaymentProcessed = await processPayment(newOrder, sinpe_url, payment_id);

    if (!isPaymentProcessed) {
        return sendClientError(serviceErrors.pay01, res, httpCodes.bad_request);
    }

    await cart.deleteOne();

    return sendOkResponse(
        { status: responseCodes.ok, order: newOrder, orderItems: newOrderItems },
        res,
    );
};

const createOrderItems = async (
    items: ICartItem[],
    orderId: string,
    sequelize: SequelizeService,
) => {
    const orderItemsPayload = items.map(item => ({
        id: crypto.randomUUID(),
        name: item.title,
        image_uri: item.primary_image_id,
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price ?? 0,
    }));
    const newOrderItems = await sequelize.db.order_item.bulkCreate(orderItemsPayload);

    return newOrderItems;
};

const getOrCreateAddress = async (
    address: ICompletePaymentViewModel['address'],
    sequelize: SequelizeService,
) => {
    if (address?.id)
        return await sequelize.db.address.findOne({
            where: {
                id: address.id,
            },
        });

    const newAddress = await sequelize.db.address.create({
        id: crypto.randomUUID(),
        email: address.email,
        address_line: address.one_line_address,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        additional_info: address.additional_info,
    });

    return newAddress;
};

const processPayment = async (order: order, sinpe_url?: string, payment_id?: string) => {
    if (payment_id) {
        const isPaymentValid = await checkStripePayment(payment_id);
        if (!isPaymentValid) {
            return false;
        }
        order.payment_method = payment_methods.credit_card;
        order.status = orderStates.processing;
    } else if (sinpe_url) {
        order.payment_method = payment_methods.sinpe;
        order.sinpe_voucher_url = sinpe_url;
        order.status = orderStates.on_hold;
    } else {
        return false;
    }

    await order.save();
    return true;
};

const checkStripePayment = async (payment_id: string) => {
    const { sk } = await OpenbaoVaultClient.getInstance().getSecret<{ pk: string; sk: string }>(
        stripeSecretKey,
    );
    const stripeClient = new stripe(sk);
    const paymentIntent = await stripeClient.paymentIntents.retrieve(payment_id);
    return paymentIntent.status === stripePaymentIntents.succeeded;
};

const createStripePaymentIntent = async (
    amount: number,
    cartId: string,
    email: string,
    stripeSK: string,
    userId?: string,
) => {
    const stripeClient = new stripe(stripeSK);
    const paymentIntent = await stripeClient.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe maneja los montos en centavos
        currency: 'CRC',
        metadata: {
            cartId,
            email,
            userId: userId ?? 'guest',
        },
    });

    if (!paymentIntent?.client_secret) return null;

    return paymentIntent.client_secret;
};
