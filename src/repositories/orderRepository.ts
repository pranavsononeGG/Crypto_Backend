import { Order } from '../interfaces';
import pool from '../config/db';

// Real Postgres Repository
export class OrderRepository {

    async create(order: Order): Promise<Order> {
        const query = `
            INSERT INTO orders (id, token_in, token_out, amount, target_price, side, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const values = [
            order.id,
            order.tokenIn,
            order.tokenOut,
            order.amount,
            order.targetPrice,
            order.side,
            order.status,
            order.createdAt,
            order.updatedAt
        ];

        try {
            const res = await pool.query(query, values);
            console.log(`[PG] Order stored: ${order.id}`);
            return this.mapRowToOrder(res.rows[0]);
        } catch (err) {
            console.error('[PG] Error creating order:', err);
            throw err;
        }
    }

    async findById(id: string): Promise<Order | null> {
        const query = 'SELECT * FROM orders WHERE id = $1';
        const res = await pool.query(query, [id]);
        if (res.rows.length === 0) return null;
        return this.mapRowToOrder(res.rows[0]);
    }

    async updateStatus(id: string, status: 'pending' | 'executed' | 'cancelled'): Promise<void> {
        const query = 'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2';
        await pool.query(query, [status, id]);
        console.log(`[PG] Order updated: ${id} -> ${status}`);
    }

    async findAll(): Promise<Order[]> {
        const res = await pool.query('SELECT * FROM orders');
        return res.rows.map(this.mapRowToOrder);
    }

    private mapRowToOrder(row: any): Order {
        return {
            id: row.id,
            tokenIn: row.token_in,
            tokenOut: row.token_out,
            amount: Number(row.amount),
            targetPrice: Number(row.target_price),
            side: row.side,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
