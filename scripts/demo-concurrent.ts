import WebSocket from 'ws';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/orders/execute';
const WS_URL = 'ws://localhost:3000/ws/orders';

const ORDERS_TO_SUBMIT = 5;

const runDemo = async () => {
    console.log(`\n🚀 Starting Concurrent Order Demo (Sending ${ORDERS_TO_SUBMIT} orders)...\n`);

    // 1. Connect WebSocket
    const ws = new WebSocket(WS_URL);
    await new Promise<void>(resolve => ws.on('open', resolve));
    console.log('✅ WebSocket Connected. Listening for updates...\n');

    // Display updates nicely
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'info') return; // Ignore handshakes

        // Colorize status if possible (simplified here)
        console.log(`[WS Update] Order ${msg.orderId?.slice(0, 8)}... | Status: ${msg.status?.toUpperCase() || 'UNKNOWN'}`);

        if (msg.status === 'confirmed' || msg.status === 'failed') {
            // Optional: Track completion
        }
    });

    // 2. Submit Orders Concurrently
    const promises = Array.from({ length: ORDERS_TO_SUBMIT }).map(async (_, i) => {
        try {
            const side = i % 2 === 0 ? 'buy' : 'sell';
            const amount = 5 + i;
            console.log(`[HTTP] Submitting Order #${i + 1} (${side.toUpperCase()} ${amount} SOL)...`);

            const res = await axios.post(API_URL, {
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount,
                targetPrice: 150,
                side
            });

            const { orderId } = res.data;
            console.log(`[HTTP] Order #${i + 1} Submitted -> ID: ${orderId}`);

            // 3. Subscribe to updates for this order immediately
            ws.send(JSON.stringify({ type: 'subscribe', orderId }));
        } catch (e: any) {
            console.error(`[HTTP] Failed to submit request #${i + 1}:`, e.message);
        }
    });

    await Promise.all(promises);
    console.log('\nAll requests sent. Watching for completion logs...\n');
};

runDemo();
