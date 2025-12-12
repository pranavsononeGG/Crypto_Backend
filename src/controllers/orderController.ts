import { FastifyRequest, FastifyReply } from 'fastify';
import { OrderProcessor } from '../services/execution/orderProcessor';
import { OrderRepository } from '../repositories/orderRepository';
import { ActiveOrderCache } from '../repositories/activeOrderCache';
import { Order } from '../interfaces';

// Helper for ID generation
const generateId = () => Math.random().toString(36).substring(2, 15);

const orderProcessor = new OrderProcessor();
const orderRepo = new OrderRepository();
const activeOrderCache = new ActiveOrderCache();

export const executeOrder = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
        const { tokenIn, tokenOut, amount, targetPrice, side } = req.body as any;

        if (!tokenIn || !tokenOut || !amount || !targetPrice || !side) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }

        console.log(`\n--- New Order Request: ${side} ${amount} ${tokenIn} -> ${tokenOut} @ ${targetPrice} ---`);

        // 1. Create Order Record
        const newOrder: Order = {
            id: generateId(),
            tokenIn,
            tokenOut,
            amount: Number(amount),
            targetPrice: Number(targetPrice),
            side,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await orderRepo.create(newOrder);
        await activeOrderCache.addActiveOrder(newOrder.id);

        // 2. Trigger Async Processing (Fire and Forget)
        orderProcessor.processOrder(newOrder).catch(err => {
            console.error(`background processing failed for ${newOrder.id}`, err);
        });

        // 3. Return Pending Status Immediately
        return reply.send({
            success: true,
            orderId: newOrder.id,
            status: 'pending',
            message: 'Order received. Connect to /ws/orders to monitor progress.'
        });

    } catch (err: any) {
        console.error("Execution failed:", err);
        return reply.status(500).send({ error: err.message });
    }
};
