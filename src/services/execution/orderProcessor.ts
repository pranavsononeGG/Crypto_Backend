import { Order, ExecutionResult } from '../../interfaces';
import { SmartRouter } from '../routing/smartRouter';
import { OrderRepository } from '../../repositories/orderRepository';
import { ActiveOrderCache } from '../../repositories/activeOrderCache';
import { redis } from '../../config/redis';

export class OrderProcessor {
    private router: SmartRouter;
    private orderRepo: OrderRepository;
    private activeOrderCache: ActiveOrderCache;

    constructor() {
        this.router = new SmartRouter();
        this.orderRepo = new OrderRepository();
        this.activeOrderCache = new ActiveOrderCache();
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
        // Fire and forget logic
        // 1. Pending (Already set by Controller, but we can confirm)
        await this.publishUpdate(order.id, 'pending');

        try {
            // 2. Routing
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
            await this.publishUpdate(order.id, 'routing');

            const bestQuote = await this.router.findBestQuote(order.tokenIn, order.tokenOut, order.amount);

            // 3. Building Transaction
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.publishUpdate(order.id, 'building', {
                dex: bestQuote.dex,
                price: bestQuote.price
            });

            // 4. Submitted
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.publishUpdate(order.id, 'submitted');

            // 5. Confirmed (Execution)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update DB
            await this.orderRepo.updateStatus(order.id, 'executed');
            await this.activeOrderCache.removeActiveOrder(order.id);

            const result: ExecutionResult = {
                success: true,
                orderId: order.id,
                dex: bestQuote.dex,
                executedPrice: bestQuote.price,
                amountOut: bestQuote.amountout,
                txHash: '0x' + Math.random().toString(36).substring(2),
                timestamp: new Date()
            };

            await this.publishUpdate(order.id, 'confirmed', result);

        } catch (err: any) {
            console.error(`[Processor] Order ${order.id} failed:`, err);
            await this.orderRepo.updateStatus(order.id, 'cancelled'); // Or failed
            await this.activeOrderCache.removeActiveOrder(order.id);
            await this.publishUpdate(order.id, 'failed', { error: err.message });
        }
    }
}
