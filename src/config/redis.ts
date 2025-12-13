import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

console.log(`[Redis] Connecting to ${redisUrl}...`);

// Publisher / General Client
export const redis = new Redis(redisUrl);
// Subscriber Client (Needs separate connection)
export const redisSub = new Redis(redisUrl, { enableReadyCheck: false, maxRetriesPerRequest: null });

redis.on('connect', () => {
    console.log('[Redis] Publisher Connected');
});

redisSub.on('connect', () => {
    console.log('[Redis] Subscriber Connected');
});

redis.on('error', (err) => {
    console.error('[Redis] Publisher Error:', err);
});

redisSub.on('error', (err) => {
    console.error('[Redis] Subscriber Error:', err);
});

export default redis; // Default export for backward compatibility if needed, but prefer named import

