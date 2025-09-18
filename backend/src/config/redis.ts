import { Redis } from 'ioredis';

const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis', // Use 'redis' service name in Docker
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
});

export { redis };
