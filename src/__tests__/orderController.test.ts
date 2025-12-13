import { executeOrder } from '../controllers/orderController';
import { FastifyRequest, FastifyReply } from 'fastify';
import { OrderRepository } from '../repositories/orderRepository';
import { ActiveOrderCache } from '../repositories/activeOrderCache';
import { OrderProcessor } from '../services/execution/orderProcessor';

// Mock Dependencies
jest.mock('../repositories/orderRepository');
jest.mock('../repositories/activeOrderCache');
jest.mock('../services/execution/orderProcessor');

describe('OrderController', () => {
    let mockReq: Partial<FastifyRequest>;
    let mockReply: Partial<FastifyReply>;
    let sendSpy: jest.Mock;
    let statusSpy: jest.Mock;

    beforeEach(() => {
        sendSpy = jest.fn();
        statusSpy = jest.fn().mockReturnThis();

        mockReq = {
            body: {}
        };
        mockReply = {
            status: statusSpy,
            send: sendSpy
        };

        jest.clearAllMocks();
    });

    it('should return 400 if required fields are missing', async () => {
        mockReq.body = { tokenIn: 'SOL' }; // Missing other fields

        await executeOrder(mockReq as FastifyRequest, mockReply as FastifyReply);

        expect(statusSpy).toHaveBeenCalledWith(400);
        expect(sendSpy).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should create order, trigger processing, and return pending status', async () => {
        mockReq.body = {
            tokenIn: 'SOL',
            tokenOut: 'USDC',
            amount: 10,
            targetPrice: 150,
            side: 'sell'
        };

        (OrderRepository.prototype.create as jest.Mock).mockResolvedValue({});
        (ActiveOrderCache.prototype.addActiveOrder as jest.Mock).mockResolvedValue(undefined);
        (OrderProcessor.prototype.processOrder as jest.Mock).mockResolvedValue(undefined);

        await executeOrder(mockReq as FastifyRequest, mockReply as FastifyReply);

        // Verify Repository Call
        expect(OrderRepository.prototype.create).toHaveBeenCalled();

        // Verify Cache Call
        expect(ActiveOrderCache.prototype.addActiveOrder).toHaveBeenCalled();

        // Verify Processor Trigger
        expect(OrderProcessor.prototype.processOrder).toHaveBeenCalled();

        // Verify Response
        expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            status: 'pending',
            message: 'Order received. Connect to /ws/orders to monitor progress.'
        }));
    });

    it('should return 500 if an error occurs', async () => {
        mockReq.body = {
            tokenIn: 'SOL',
            tokenOut: 'USDC',
            amount: 10,
            targetPrice: 150,
            side: 'sell'
        };

        // Simulate Error
        (OrderRepository.prototype.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

        await executeOrder(mockReq as FastifyRequest, mockReply as FastifyReply);

        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(sendSpy).toHaveBeenCalledWith({ error: 'DB Error' });
    });
});
