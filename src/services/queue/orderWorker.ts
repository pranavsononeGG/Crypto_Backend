import { Worker, Job } from 'bullmq';
import { connection, QUEUE_NAME, WORKER_OPTS } from '../../config/queue';
import { SmartRouter } from '../routing/smartRouter';
import { OrderRepository } from '../../repositories/orderRepository';
import { ActiveOrderCache } from '../../repositories/activeOrderCache';
import { redis } from '../../config/redis';
import { Order, ExecutionResult } from '../../interfaces';

export class OrderWorker {
    private worker: Worker;
    private router: SmartRouter;
    private orderRepo: OrderRepository;
    private activeOrderCache: ActiveOrderCache;

    constructor() {
        this.router = new SmartRouter();
        this.orderRepo = new OrderRepository();
        this.activeOrderCache = new ActiveOrderCache();

        this.worker = new Worker(QUEUE_NAME, this.processJob.bind(this), {
            connection,
            ...WORKER_OPTS
        });

        this.setupListeners();
        console.log(`[Worker] Started ${QUEUE_NAME} with concurrency ${WORKER_OPTS.concurrency}`);
    }

    private setupListeners() {
        this.worker.on('completed', (job) => {
            console.log(`[Worker] Job ${job.id} completed!`);
        });

        this.worker.on('failed', async (job, err) => {
            console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
            if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
                await this.handleFinalFailure(job.data, err.message);
            }
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
        console.log(`[Worker] Published update for ${orderId}: ${status}`);
    }

    private async processJob(job: Job<Order>) {
        const order = job.data;
        console.log(`[Worker] Processing order ${order.id} (Attempt ${job.attemptsMade + 1})`);

        // 2. Routing
        await this.publishUpdate(order.id, 'routing');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

        const bestQuote = await this.router.findBestQuote(order.tokenIn, order.tokenOut, order.amount);

        // 3. Building Transaction
        await this.publishUpdate(order.id, 'building', {
            dex: bestQuote.dex,
            price: bestQuote.price
        });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. Submitted
        await this.publishUpdate(order.id, 'submitted');
        await new Promise(resolve => setTimeout(resolve, 500));

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
        return result;
    }

    private async handleFinalFailure(order: Order, errorMsg: string) {
        console.log(`[Worker] Final failure for ${order.id}`);
        await this.orderRepo.updateStatus(order.id, 'cancelled'); // Requires DB update? Or just cancelled?
        await this.activeOrderCache.removeActiveOrder(order.id);
        await this.publishUpdate(order.id, 'failed', { error: errorMsg });
    }

    public async close() {
        await this.worker.close();
    }
}
