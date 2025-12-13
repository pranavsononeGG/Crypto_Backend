import app from '../app';
import { WebSocketServer } from 'ws';
import Fastify from 'fastify';
import WebSocket from 'ws';
import { redis, redisSub } from '../config/redis';

// Note: Testing WS with Fastify + ws library integration requires
// spinning up the raw server.
let server: any;
let wss: WebSocketServer;
const TEST_PORT = 3002;

jest.mock('../config/redis', () => {
    // We need real Redis for Pub/Sub testing if we want true integration
    // But to keep it simple and avoid port conflicts, we might spy or mock.
    // Let's rely on the real one imported, hope for no conflict.
    const actual = jest.requireActual('../config/redis');
    return actual;
});

describe('WebSocket Integration', () => {
    beforeAll(async () => {
        // Setup minimal server similar to src/server.ts
        try {
            await app.ready();
            await app.listen({ port: TEST_PORT, host: '0.0.0.0' });
        } catch (e) {
            console.error('Setup failed', e);
        }
    });

    afterAll(async () => {
        await app.close();
    });

    it('should connect and receive welcome message', (done) => {
        const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws/orders`);
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            expect(msg.type).toBe('info');
            expect(msg.message).toContain('Welcome');
            ws.close();
            done();
        });
    });

    it('should subscribe and receive updates via Redis Pub/Sub', (done) => {
        const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws/orders`);

        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'subscribe', orderId: 'ws-test-123' }));
        });

        let msgCount = 0;
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());

            if (msg.message && msg.message.includes('Welcome')) return; // Ignore welcome

            if (msg.message && msg.message.includes('Subscribed')) {
                // Trigger Redis Publish
                setTimeout(() => {
                    redis.publish('order_updates:ws-test-123', JSON.stringify({ status: 'confirmed' }));
                }, 100);
            }

            if (msg.status === 'confirmed') {
                ws.close();
                done(); // Success
            }
        });
    });
});
