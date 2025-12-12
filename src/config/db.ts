import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.POSTGRES_URL || 'postgres://postgres:secret@localhost:5432/crypto_db';

console.log(`[PG] Connecting to database...`);
const pool = new Pool({
    connectionString,
});

pool.on('error', (err) => {
    console.error('[PG] Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
