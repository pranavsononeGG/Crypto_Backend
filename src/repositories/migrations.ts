import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Determine if we are in production (Render sets this to 'production')
const isProduction = process.env.NODE_ENV === 'production';

let poolConfig: PoolConfig;

if (process.env.DATABASE_URL) {
    // ---------------------------------------------------------
    // 1. RENDER CONFIGURATION (Production)
    // ---------------------------------------------------------
    console.log('[PG] Using DATABASE_URL connection (Render/Cloud)');
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Render's self-signed certs
        }
    };
} else {
    // ---------------------------------------------------------
    // 2. LOCAL DOCKER CONFIGURATION (Development)
    // ---------------------------------------------------------
    console.log('[PG] Using Local configuration (Docker/Localhost)');
    poolConfig = {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'postgres',
        ssl: false // Explicitly disable SSL for local dev
    };
}

const pool = new Pool(poolConfig);

// Log unexpected errors on idle clients
pool.on('error', (err) => {
    console.error('[PG] Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
