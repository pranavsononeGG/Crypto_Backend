export interface Order {
    id: string;
    tokenIn: string;
    tokenOut: string;
    amount: number;
    targetPrice: number;
    side: 'buy' | 'sell';
    status: 'pending' | 'executed' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
}

export interface LimitOrder extends Order {
    type: 'limit';
}

export interface Quote {
    dex: 'raydium' | 'meteora';
    price: number;
    amountout: number;
}

export interface ExecutionResult {
    success: boolean;
    orderId: string;
    dex?: 'raydium' | 'meteora';
    executedPrice?: number;
    amountOut?: number;
    txHash?: string;
    error?: string;
    timestamp: Date;
}

export interface LiquidityProvider {
    name: string;
    getQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote>;
}
