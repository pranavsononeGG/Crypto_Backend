import app from './app';
import { runMigrations } from './repositories/migrations';
import { WebSocketServer } from 'ws';
import { redisSub } from './config/redis';
import { OrderWorker } from './services/queue/orderWorker';

const PORT = 3000;

// Initialize Worker (Global)
const worker = new OrderWorker();

const start = async () => {
    await runMigrations();
    try {
        await app.ready();

        await app.listen({ port: PORT, host: '0.0.0.0' });

        console.log(`Order Execution Engine running on http://localhost:${PORT}`);
        console.log(`Ready to process orders at POST /api/orders/execute`);

        // Initialize WebSocket Server attached to Fastify's raw server
        const wss = new WebSocketServer({ server: app.server, path: '/ws/orders' });
        console.log(`WebSocket Endpoint: ws://localhost:${PORT}/ws/orders`);

        wss.on('connection', (ws) => {
            console.log('[WS] Client connected');
            ws.send(JSON.stringify({ type: 'info', message: 'Welcome to Order Execution Stream' }));

            ws.on('message', async (message) => {
                try {
                    const msg = JSON.parse(message.toString());
                    if (msg.type === 'subscribe' && msg.orderId) {
                        console.log(`[WS] Subscribing to ${msg.orderId}`);

                        // Note: redisSub is global. We need to be careful not to duplicate listeners globally.
                        // For this demo, we will just add a listener that filters for this socket.
                        // In production, we'd manage a map of subscribers.

                        const handler = (channel: string, redisMsg: string) => {
                            if (channel === `order_updates:${msg.orderId}`) {
                                if (ws.readyState === 1) { // OPEN
                                    ws.send(redisMsg);
                                }
                            }
                        };

                        redisSub.on('message', handler);
                        await redisSub.subscribe(`order_updates:${msg.orderId}`);

                        ws.send(JSON.stringify({ type: 'info', message: `Subscribed to ${msg.orderId}` }));

                        ws.on('close', () => {
                            redisSub.off('message', handler);
                            // We could unsubscribe if no one else is listening, but keeping it simple.
                        });
                    }
                } catch (err) {
                    console.error('[WS] Error:', err);
                }
            });
        });

    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
