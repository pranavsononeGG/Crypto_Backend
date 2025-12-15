import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let poolConfig: PoolConfig;

// Check for Render's automatic environment variable first
if (process.env.DATABASE_URL) {
    console.log(`[PG] Connecting to Render/Cloud database...`);
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Render
        }
    };
} else {
    // Fallback to Local Docker (uses your POSTGRES_URL or the default string)
    console.log(`[PG] Connecting to Local Docker database...`);
    poolConfig = {
        connectionString: process.env.POSTGRES_URL || 'postgres://postgres:secret@localhost:5432/crypto_db',
        ssl: false // Disable SSL for local development
    };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('[PG] Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
