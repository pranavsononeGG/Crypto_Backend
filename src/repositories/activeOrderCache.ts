// Mimics Redis Cache for fast access to active orders
export class ActiveOrderCache {
    private activeOrders: Set<string> = new Set();

    async addActiveOrder(orderId: string): Promise<void> {
        // Simulate Network Latency
        await new Promise(resolve => setTimeout(resolve, 10));
        this.activeOrders.add(orderId);
        console.log(`[Redis] Added active order: ${orderId}`);
    }

    async removeActiveOrder(orderId: string): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 10));
        this.activeOrders.delete(orderId);
        console.log(`[Redis] Removed active order: ${orderId}`);
    }

    async isOrderActive(orderId: string): Promise<boolean> {
        return this.activeOrders.has(orderId);
    }
}
