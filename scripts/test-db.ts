import { Pool } from 'pg';

const connectionString = 'postgres://postgres:secret@localhost:5433/crypto_db';

const pool = new Pool({
    connectionString,
});

console.log('Testing DB initialization...');
pool.connect()
    .then(client => {
        console.log('Connected!');
        return client.query('SELECT NOW()')
            .then(res => {
                console.log('Time:', res.rows[0]);
                client.release();
                process.exit(0);
            })
            .catch(e => {
                console.error('Query error', e);
                client.release();
                process.exit(1);
            });
    })
    .catch(e => {
        console.error('Connection error', e);
        process.exit(1);
    });
