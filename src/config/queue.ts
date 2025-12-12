import { ConnectionOptions } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const url = new URL(redisUrl);

export const connection: ConnectionOptions = {
    host: url.hostname,
    port: parseInt(url.port),
    ...(url.password ? { password: url.password } : {}),
    ...(url.username ? { username: url.username } : {})
};

export const QUEUE_NAME = 'execution-queue';

export const QUEUE_OPTS = {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true, // Keep memory clean
        removeOnFail: false // Keep failed jobs for inspection
    }
};

export const WORKER_OPTS = {
    concurrency: 10,
    limiter: {
        max: 100,
        duration: 60000 // 1 minute
    }
};
