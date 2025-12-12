import http, { IncomingMessage } from 'http';

const postData = JSON.stringify({
    tokenIn: 'SOL',
    tokenOut: 'USDC',
    amount: 10,
    targetPrice: 150,
    side: 'sell'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/orders/execute',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('--- Sending Test Order ---');
const req = http.request(options, (res: IncomingMessage) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk: any) => { data += chunk; });
    res.on('end', () => {
        console.log('RESPONSE BODY:', JSON.parse(data));
        process.exit(0);
    });
});

req.on('error', (e: any) => {
    console.error(`problem with request: ${e.message}`);
    process.exit(1);
});

req.write(postData);
req.end();
