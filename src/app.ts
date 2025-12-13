import fastify from 'fastify';
import websocket from '@fastify/websocket';
import wsRoutes from './routes/ws';
import { executeOrder } from './controllers/orderController';

const app = fastify({ logger: true });

app.register(websocket);
app.register(wsRoutes);

app.post('/api/orders/execute', executeOrder);

export default app;
