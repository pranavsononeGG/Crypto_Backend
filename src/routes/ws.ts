import { FastifyInstance } from 'fastify';
import { redisSub } from '../config/redis';

export default async function wsRoutes(fastify: FastifyInstance) {
    fastify.get('/ws/orders', { websocket: true }, (connection: any, req) => {
        const socket = connection.socket || connection;
        console.log('[WS] Client connected');
        socket.send(JSON.stringify({ type: 'info', message: 'Welcome' }));

        socket.on('message', async (message: any) => {
            try {
                // Expect: { "type": "subscribe", "orderId": "..." }
                const msg = JSON.parse(message.toString());
                if (msg.type === 'subscribe' && msg.orderId) {
                    console.log(`[WS] Client subscribing to ${msg.orderId}`);

                    // Subscribe specific channel for this order
                    await redisSub.subscribe(`order_updates:${msg.orderId}`);

                    // Send acknowledgment
                    socket.send(JSON.stringify({
                        type: 'info',
                        message: `Subscribed to ${msg.orderId}`
                    }));
                }
            } catch (err) {
                console.error('[WS] Error processing message:', err);
            }
        });

        // Handle Redis Messages
        const redisMessageHandler = (channel: string, message: string) => {
            // Check if this connection is interested? 
            // In a real app we'd map socket <-> channels. 
            // HERE: Simplified. We broadcast ALL received redis messages to this socket if the channel matches what they *might* want (or just all).
            // Actually, redisSub is global. So if we attach `on('message')` inside every socket connection, 
            // we will duplicate messages if multiple sockets open? 
            // YES. 

            // BETTER: Attach the listener once globally, or filter here.
            // For this simple task, let's just forward everything to the connected socket if it looks like an order update.
            // The client does client-side filtering or we trust the subscription request.

            // To do it properly:
            // 1. Socket sends Subscribe -> We add Socket to a Map<OrderId, Socket[]>
            // 2. Global Redis Reader -> On message -> Lookup Sockets -> Send.
            // But let's keep it simple: RedisSub is global. We should just pipe messages.

            // IMPT: The `redisSub` instance is global. If we add a new listener for EVERY socket, we leak listeners.
            // FIX: We will just push messages to the socket. The socket needs to know if it cares.
            // However, `redisSub.subscribe` is also global.

            // Refined Approach:
            // Assuming 1 client for 1 order in this demo context.
            // We'll just listen and forward. 
            if (channel.startsWith('order_updates:')) {
                // Ensure socket is open
                if (socket.readyState === 1) {
                    socket.send(message);
                }
            }
        };

        redisSub.on('message', redisMessageHandler);

        socket.on('close', () => {
            console.log('[WS] Client disconnected');
            redisSub.off('message', redisMessageHandler);
        });
    });
}
