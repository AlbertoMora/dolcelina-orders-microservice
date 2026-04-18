import { Express } from 'express';
import ordersRoutes from '../routes/orders.routes';
import cartRoutes from '../routes/cart.routes';

export const setRoutesConfig = (app: Express) => {
    app.use('/v1/orders/', ordersRoutes);
    app.use('/v1/cart/', cartRoutes);
};
