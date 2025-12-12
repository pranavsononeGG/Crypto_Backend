import fastify from 'fastify';
import { executeOrder } from './controllers/orderController';

const app = fastify({ logger: true });

app.post('/api/orders/execute', executeOrder);

export default app;
