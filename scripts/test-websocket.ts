import WebSocket from 'ws';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/orders/execute';
const WS_URL = 'ws://localhost:3000/ws/orders';

const runTest = async () => {
    // 1. Connect WS
    const ws = new WebSocket(WS_URL);

    await new Promise<void>(resolve => {
        ws.on('open', () => {
            console.log('[Client] Connected to WebSocket');
            resolve();
        });
    });

    // 2. Listen for messages
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`[Client] Received Update:`, msg);

            if (msg.status === 'confirmed') {
                console.log('[Client] Order Confirmed! Test Passed.');
                ws.close();
                process.exit(0);
            }
            if (msg.status === 'failed') {
                console.error('[Client] Order Failed.');
                ws.close();
                process.exit(1);
            }
        } catch (e) {
            console.log(`[Client] Non-JSON or Info: ${data}`);
        }
    });

    ws.on('error', (err) => console.error('[Client] WS Error:', err));
    ws.on('unexpected-response', (req, res) => {
        console.error(`[Client] Unexpected Response: ${res.statusCode} ${res.statusMessage}`);
        process.exit(1);
    });
    ws.on('close', () => console.log('[Client] WS Closed'));

    // 3. Submit Order
    console.log('[Client] submitting order...');
    const response = await axios.post(API_URL, {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 5,
        targetPrice: 155,
        side: 'sell'
    });

    const { orderId } = response.data;
    console.log(`[Client] Order Submitted. ID: ${orderId}`);

    // 4. Subscribe
    ws.send(JSON.stringify({
        type: 'subscribe',
        orderId
    }));
};

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
