import { Queue } from 'bullmq';
import { connection, QUEUE_NAME, QUEUE_OPTS } from '../../config/queue';
import { Order } from '../../interfaces';
import { redis } from '../../config/redis';

export class OrderProcessor {
    private queue: Queue;

    constructor() {
        this.queue = new Queue(QUEUE_NAME, {
            connection,
            defaultJobOptions: QUEUE_OPTS.defaultJobOptions
        });
    }

    private async publishUpdate(orderId: string, status: string, data?: any) {
        const payload = JSON.stringify({
            orderId,
            status,
            timestamp: new Date(),
            ...data
        });
        await redis.publish(`order_updates:${orderId}`, payload);
        console.log(`[Processor] Published update for ${orderId}: ${status}`);
    }

    async processOrder(order: Order) {
        // 1. Pending Update
        await this.publishUpdate(order.id, 'pending');

        // 2. Add to Queue
        await this.queue.add('execute-order', order);
        console.log(`[Processor] Added order ${order.id} to queue`);
    }

    async close() {
        await this.queue.close();
    }
}
