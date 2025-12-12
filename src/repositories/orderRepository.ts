import { Order } from '../interfaces';

// Mimics a Postgres Repository
export class OrderRepository {
    private orders: Map<string, Order> = new Map();

    async create(order: Order): Promise<Order> {
        // Simulate DB Latency
        await new Promise(resolve => setTimeout(resolve, 50));
        this.orders.set(order.id, order);
        console.log(`[PG] Order stored: ${order.id}`);
        return order;
    }

    async findById(id: string): Promise<Order | null> {
        await new Promise(resolve => setTimeout(resolve, 20));
        return this.orders.get(id) || null;
    }

    async updateStatus(id: string, status: 'pending' | 'executed' | 'cancelled'): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 50));
        const order = this.orders.get(id);
        if (order) {
            order.status = status;
            order.updatedAt = new Date();
            this.orders.set(id, order);
            console.log(`[PG] Order updated: ${id} -> ${status}`);
        }
    }

    async findAll(): Promise<Order[]> {
        return Array.from(this.orders.values());
    }
}
