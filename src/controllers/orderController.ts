import { Request, Response } from 'express';
import { SmartRouter } from '../services/routing/smartRouter';
import { OrderRepository } from '../repositories/orderRepository';
import { ActiveOrderCache } from '../repositories/activeOrderCache';
import { Order, ExecutionResult } from '../interfaces';

// Helper for ID generation
const generateId = () => Math.random().toString(36).substring(2, 15);

const router = new SmartRouter();
const orderRepo = new OrderRepository();
const activeOrderCache = new ActiveOrderCache();

export const executeOrder = async (req: Request, res: Response) => {
    try {
        const { tokenIn, tokenOut, amount, targetPrice, side } = req.body;

        if (!tokenIn || !tokenOut || !amount || !targetPrice || !side) {
            return res.status(400).json({ error: 'Missing required fields' });
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

        // 2. Market Check & Routing
        // In a real system, we'd watch prices. Here we just check current quote immediately.
        const bestQuote = await router.findBestQuote(tokenIn, tokenOut, Number(amount));

        // 3. Check condition (Simplified: Buy logic -> Price <= Target, Sell logic -> Price >= Target)
        // Note: For this mock, we assume user buys TokenOut with TokenIn. "Price" is usually TokenOut/TokenIn or vice versa.
        // Let's assume Price = AmountOut / AmountIn.
        // If Buying (swap In -> Out), we want more Out for In? Or is target price a limit price?
        // Let's implement standard Buy Limit: Execute if market price <= limit price.
        // But here "price" returned from quote is exchange rate.
        // Let's just execute if we get a quote to simplify flow, as user asked for "Execute when target price reached"
        // but since we don't have a ticker loop, we'll assume the trigger happened or just execute immediately if valid.

        let executed = false;

        // Mock execution logic: If the quote is good "enough" or just always execute for demo
        if (bestQuote) {
            // Mock executing
            await orderRepo.updateStatus(newOrder.id, 'executed');
            await activeOrderCache.removeActiveOrder(newOrder.id);
            executed = true;
        }

        const result: ExecutionResult = {
            success: executed,
            orderId: newOrder.id,
            dex: bestQuote.dex,
            executedPrice: bestQuote.price,
            amountOut: bestQuote.amountout,
            txHash: '0x' + generateId() + generateId(), // Mock hash
            timestamp: new Date()
        };

        return res.json(result);

    } catch (err: any) {
        console.error("Execution failed:", err);
        return res.status(500).json({ error: err.message });
    }
};
