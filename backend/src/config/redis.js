const Redis = require('ioredis');
const logger = require('../utils/logger');

const createClient = () => {
    const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    client.on('connect', () => {
        logger.info('Redis client connected');
    });

    client.on('error', (error) => {
        logger.error('Redis client error:', error);
    });

    return client;
};

module.exports = createClient;