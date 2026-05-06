import { Request, Response } from 'express';
import { SequelizeService } from '../services/sequelize-service';
import {
    avoidNanParseInt,
    httpCodes,
    responseCodes,
    sendClientError,
    sendOkResponse,
} from '@amora95/commons';
import { serviceErrors } from '../constants/service-errors';
import { IGetOrdersQueryViewModel, IUpdateOrderViewModel } from '../viewmodels/orders.viewmodels';
import moment from 'moment';
import { Op } from 'sequelize';
import { IQueryViewModel } from '../types/commons.types';
import { orderStates } from '../constants/orders-constants';

export const getOrdersAction = async (
    req: Request<{}, {}, {}, IGetOrdersQueryViewModel>,
    res: Response,
) => {
    const { orderField, orderDirection, limit, offset, ...rest } = req.query;
    const params = getSearchableFields(rest);

    const sequelize = await SequelizeService.getInstance();

    const orders = await sequelize.db.order.findAll({
        limit: avoidNanParseInt(limit),
        offset: avoidNanParseInt(offset),
        order: [[orderField?.trim() || 'created_at', orderDirection || 'DESC']],
        where: { ...params },
        include: [{ model: sequelize.db.address, as: 'shipping_address' }],
    });

    if (!orders) return sendClientError(serviceErrors.ord01, res, httpCodes.not_found);

    return sendOkResponse({ status: responseCodes.ok, orders }, res);
};

export const getOrderByIdAction = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const sequelize = await SequelizeService.getInstance();

    const order = await sequelize.db.order.findByPk(id, {
        include: [
            { model: sequelize.db.order_item, as: 'order_items' },
            { model: sequelize.db.address, as: 'shipping_address' },
        ],
    });

    if (!order) return sendClientError(serviceErrors.ord01, res, httpCodes.not_found);

    return sendOkResponse({ status: responseCodes.ok, order }, res);
};

export const setOrderNextStateAction = async (
    req: Request<{ id: string }, {}, { shipping_number?: string }>,
    res: Response,
) => {
    const { id } = req.params;
    const { shipping_number } = req.body;
    const sequelize = await SequelizeService.getInstance();

    const order = await sequelize.db.order.findByPk(id);
    if (!order) return sendClientError(serviceErrors.ord01, res, httpCodes.not_found);

    order.status = getNextOrderState(order.status);

    if (order.status === orderStates.shipping && shipping_number) {
        order.shipping_number = shipping_number;
    } else if (order.status === orderStates.shipping && !shipping_number) {
        return sendClientError(serviceErrors.ord03, res, httpCodes.bad_request);
    }

    order.last_modified = moment().utc().toDate();
    await order.save();

    return sendOkResponse({ status: responseCodes.ok, order }, res);
};

export const updateOrderAction = async (
    req: Request<{ id: string }, {}, IUpdateOrderViewModel, {}>,
    res: Response,
) => {
    const { id } = req.params;
    const { email, total, status, payment_method, shipping_address_id } = req.body;

    const sequelize = await SequelizeService.getInstance();

    const order = await sequelize.db.order.findByPk(id);
    if (!order) return sendClientError(serviceErrors.ord01, res, httpCodes.not_found);

    const updatePayload: Record<string, unknown> = {
        last_modified: moment().utc().toDate(),
    };

    if (email !== undefined) updatePayload.email = email;
    if (total !== undefined) updatePayload.total = total;
    if (status !== undefined) updatePayload.status = status;
    if (payment_method !== undefined) updatePayload.payment_method = payment_method;
    if (shipping_address_id !== undefined) updatePayload.shipping_address_id = shipping_address_id;

    const updatedOrder = await order.update(updatePayload);

    return sendOkResponse({ status: responseCodes.ok, order: updatedOrder }, res);
};

export const deleteOrderAction = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    const sequelize = await SequelizeService.getInstance();

    const order = await sequelize.db.order.findByPk(id);
    if (!order) return sendClientError(serviceErrors.ord01, res, httpCodes.not_found);

    await sequelize.db.order_item.destroy({ where: { order_id: id } });
    await order.destroy();

    return sendOkResponse({ status: responseCodes.ok }, res);
};

export const rejectOrderAction = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const sequelize = await SequelizeService.getInstance();

    const order = await sequelize.db.order.findByPk(id);
    if (!order) return sendClientError(serviceErrors.ord01, res, httpCodes.not_found);

    if (order.status > orderStates.on_hold) {
        return sendClientError(serviceErrors.ord04, res, httpCodes.bad_request);
    }

    order.status = orderStates.rejected;
    order.last_modified = moment().utc().toDate();
    await order.save();

    return sendOkResponse({ status: responseCodes.ok, order }, res);
};

const getSearchableFields = (query: Omit<IGetOrdersQueryViewModel, keyof IQueryViewModel>) => {
    const { status, payment_method, min_date, max_date, user_id } = query;
    const searchableFields: Record<string, unknown> = {};

    if (user_id) searchableFields.email = user_id;
    if (status) searchableFields.status = status;
    if (payment_method) searchableFields.payment_method = payment_method;
    if (min_date && max_date)
        searchableFields.created_at = { [Op.between]: [new Date(min_date), new Date(max_date)] };

    return searchableFields;
};

const getNextOrderState = (currentState: number) => {
    return currentState >= orderStates.completed ? currentState : currentState + 1;
};
