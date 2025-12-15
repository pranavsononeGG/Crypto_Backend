import pool from '../config/db';

export const runMigrations = async () => {
    const client = await pool.connect();
    try {
        console.log('[PG] Running migrations...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(50) PRIMARY KEY,
                token_in VARCHAR(20),
                token_out VARCHAR(20),
                amount NUMERIC,
                target_price NUMERIC,
                side VARCHAR(10),
                status VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[PG] Migrations completed: "orders" table is ready.');
    } catch (err) {
        console.error('[PG] Migration failed:', err);
    } finally {
        client.release();
    }
};
