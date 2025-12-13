import { OrderRepository } from '../repositories/orderRepository';
import { ActiveOrderCache } from '../repositories/activeOrderCache';
import pool from '../config/db';
import redis from '../config/redis';

// Mock DB and Redis
jest.mock('../config/db', () => ({
    query: jest.fn()
}));
jest.mock('../config/redis', () => ({
    sadd: jest.fn(),
    srem: jest.fn(),
    sismember: jest.fn()
}));

describe('Repositories', () => {
    describe('OrderRepository', () => {
        let repo: OrderRepository;

        beforeEach(() => {
            repo = new OrderRepository();
            jest.clearAllMocks();
        });

        it('should create an order', async () => {
            (pool.query as jest.Mock).mockResolvedValue({
                rows: [{
                    id: '123',
                    token_in: 'SOL',
                    token_out: 'USDC',
                    amount: 1,
                    target_price: 150,
                    side: 'sell',
                    status: 'pending',
                    created_at: new Date(),
                    updated_at: new Date()
                }]
            });

            const order = await repo.create({
                id: '123',
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 1,
                targetPrice: 150,
                side: 'sell',
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            });

            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'), expect.any(Array));
            expect(order.id).toBe('123');
        });

        it('should find an order by id', async () => {
            (pool.query as jest.Mock).mockResolvedValue({
                rows: [{
                    id: '123',
                    token_in: 'SOL',
                    amount: 1
                }]
            });

            const order = await repo.findById('123');
            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM'), ['123']);
            expect(order?.id).toBe('123');
        });
    });

    describe('ActiveOrderCache', () => {
        let cache: ActiveOrderCache;

        beforeEach(() => {
            cache = new ActiveOrderCache();
            jest.clearAllMocks();
        });

        it('should add active order', async () => {
            await cache.addActiveOrder('123');
            expect(redis.sadd).toHaveBeenCalledWith('active_orders', '123');
        });

        it('should remove active order', async () => {
            await cache.removeActiveOrder('123');
            expect(redis.srem).toHaveBeenCalledWith('active_orders', '123');
        });

        it('should check if order is active', async () => {
            (redis.sismember as jest.Mock).mockResolvedValue(1);
            const isActive = await cache.isOrderActive('123');
            expect(redis.sismember).toHaveBeenCalledWith('active_orders', '123');
            expect(isActive).toBe(true);
        });
    });
});
