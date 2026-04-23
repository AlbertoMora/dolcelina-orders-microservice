import { connect } from 'mongoose';
import { createClient } from 'redis';

export const initMongoDB = async () => {
    const { MONGODB_URI: mongoUri } = process.env;
    try {
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        await connect(mongoUri);
        console.log('✅ MongoDB connection has been established successfully.');
    } catch (error) {
        console.error(
            '❌ Cannot connect to MongoDB Server:',
            error instanceof Error ? error.message : String(error),
        );
        throw error;
    }
};

export const redisClient = createClient();

redisClient
    .connect()
    .then(() => {
        console.log('✅ Redis connection established successfully');
    })
    .catch(error => {
        console.error(
            '❌ Failed to connect to Redis:',
            error instanceof Error ? error.message : String(error),
        );
    });
