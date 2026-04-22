require('dotenv').config();
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setAppConfig } from './config/app-config';
import { setMiddlewares } from './config/middlewares';
import { setRoutesConfig } from './config/route-config';
import { appStart } from './config/app-start';
import { initMongoDB } from './config/db-config';
import Sniffr from 'sniffr';

export const app = express();

const server = createServer(app);
export const io = new Server(server);

export const sniffr = new Sniffr();

setAppConfig(app);
setMiddlewares(app, express);
setRoutesConfig(app);

const bootstrap = () => {
    appStart(server, app);
    initMongoDB();
};

// ✅ This is the critical guard — without it, every Jest import triggers
// real DB/Redis connections and tests fail with ConnectionTimeoutError
if (process.env.NODE_ENV !== 'test') {
    bootstrap();
}

export default app;
