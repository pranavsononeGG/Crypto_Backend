import app from './app';
import { runMigrations } from './repositories/migrations';

const PORT = 3000;

const start = async () => {
    await runMigrations();
    app.listen(PORT, () => {
        console.log(`Order Execution Engine running on http://localhost:${PORT}`);
        console.log(`Ready to process orders at POST /api/orders/execute`);
    });
};

start();
