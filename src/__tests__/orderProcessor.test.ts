import { OrderProcessor } from '../services/execution/orderProcessor';
import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { Order } from '../interfaces';

jest.mock('bullmq');
jest.mock('../config/redis', () => ({
    redis: {
        publish: jest.fn(),
    }
}));
jest.mock('../config/queue', () => ({
    QUEUE_NAME: 'test-queue',
    connection: {},
    QUEUE_OPTS: { defaultJobOptions: {} }
}));

describe('OrderProcessor', () => {
    let processor: OrderProcessor;
    let mockQueue: jest.Mocked<Queue>;

    beforeEach(() => {
        // Clear mocks logic
        (Queue as unknown as jest.Mock).mockClear();
        (redis.publish as jest.Mock).mockClear();

        processor = new OrderProcessor();
        mockQueue = (Queue as unknown as jest.Mock).mock.instances[0] as jest.Mocked<Queue>;
    });

    it('should add order to queue and publish pending status', async () => {
        const order: Order = {
            id: 'test-123',
            tokenIn: 'SOL',
            tokenOut: 'USDC',
            amount: 1,
            side: 'sell',
            targetPrice: 150,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await processor.processOrder(order);

        // Verify Redis Publish
        expect(redis.publish).toHaveBeenCalledWith(
            'order_updates:test-123',
            expect.stringContaining('"status":"pending"')
        );

        // Verify Queue Add
        expect(mockQueue.add).toHaveBeenCalledWith('execute-order', order);
    });
});
