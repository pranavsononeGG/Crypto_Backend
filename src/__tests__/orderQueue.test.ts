import { Queue, Worker } from 'bullmq';
import { QUEUE_OPTS, connection } from '../config/queue';
import { OrderWorker } from '../services/queue/orderWorker';
import { OrderProcessor } from '../services/execution/orderProcessor';
import { Order } from '../interfaces';
import { redis } from '../config/redis';

// We use REAL Queue/Redis here, but we might want to clean up before/after
const TEST_QUEUE_NAME = 'test-integration-queue';
jest.setTimeout(10000);

// Mock external services to avoid actual API calls/DB writes during this test
jest.mock('../services/dex/raydium', () => ({
    RaydiumService: jest.fn().mockImplementation(() => ({
        getQuote: jest.fn().mockResolvedValue({ price: 150, amountout: 150, dex: 'raydium' })
    }))
}));
jest.mock('../services/dex/meteora', () => ({
    MeteoraService: jest.fn().mockImplementation(() => ({
        getQuote: jest.fn().mockResolvedValue({ price: 145, amountout: 145, dex: 'meteora' })
    }))
}));
jest.mock('../repositories/orderRepository');
jest.mock('../repositories/activeOrderCache');

// Mock Queue config to use test queue 
jest.mock('../config/queue', () => ({
    QUEUE_NAME: 'test-integration-queue',
    connection: { host: 'localhost', port: 6379 }, // Assuming local Redis
    QUEUE_OPTS: { defaultJobOptions: { removeOnComplete: false } },
    WORKER_OPTS: { concurrency: 1, limiter: { max: 10, duration: 1000 } }
}));

describe('OrderQueue Integration', () => {
    let processor: OrderProcessor;
    let workerService: OrderWorker;
    let testQueue: Queue;

    beforeAll(async () => {
        // Cleanup existing queue
        testQueue = new Queue(TEST_QUEUE_NAME, { connection: { host: 'localhost', port: 6379 } });
        await testQueue.obliterate({ force: true });

        processor = new OrderProcessor();
        workerService = new OrderWorker();
    });

    afterAll(async () => {
        await processor.close();
        await workerService.close();
        await testQueue.close();
        await new Promise(resolve => setTimeout(resolve, 500)); // drain
    });

    it('should process a job through the full lifecycle', async () => {
        const order: Order = {
            id: 'integration-1',
            tokenIn: 'SOL',
            tokenOut: 'USDC',
            amount: 1,
            side: 'sell',
            status: 'pending',
            targetPrice: 150,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Spy on publish to verify status updates
        const publishSpy = jest.spyOn(redis, 'publish');

        // Add to queue
        await processor.processOrder(order);

        // Wait for worker to process (Worker has delays simulated: 1s+1s+0.5s+1s = ~3.5s)
        await new Promise(resolve => setTimeout(resolve, 4500));

        // Verify status updates published
        // pending (processor) -> routing -> building -> submitted -> confirmed (worker)
        expect(publishSpy).toHaveBeenCalledWith(expect.stringContaining('integration-1'), expect.stringContaining('pending'));
        expect(publishSpy).toHaveBeenCalledWith(expect.stringContaining('integration-1'), expect.stringContaining('routing'));
        expect(publishSpy).toHaveBeenCalledWith(expect.stringContaining('integration-1'), expect.stringContaining('confirmed'));

        // Wait for job completion (up to 5s)
        let counts = await testQueue.getJobCounts();
        for (let i = 0; i < 10; i++) {
            if ((counts.completed ?? 0) > 0) break;
            await new Promise(r => setTimeout(r, 500));
            counts = await testQueue.getJobCounts();
        }

        expect(counts.completed).toBeGreaterThanOrEqual(1);
    });
});
