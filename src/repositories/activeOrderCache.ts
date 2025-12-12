import redis from '../config/redis';

// Uses Redis Cache for fast access to active orders
export class ActiveOrderCache {
    private readonly KEY = 'active_orders';

    async addActiveOrder(orderId: string): Promise<void> {
        await redis.sadd(this.KEY, orderId);
        console.log(`[Redis] Added active order: ${orderId}`);
    }

    async removeActiveOrder(orderId: string): Promise<void> {
        await redis.srem(this.KEY, orderId);
        console.log(`[Redis] Removed active order: ${orderId}`);
    }

    async isOrderActive(orderId: string): Promise<boolean> {
        const result = await redis.sismember(this.KEY, orderId);
        return result === 1;
    }
}
