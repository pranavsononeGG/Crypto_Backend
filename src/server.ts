import app from './app';

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Order Execution Engine running on http://localhost:${PORT}`);
    console.log(`Ready to process orders at POST /api/orders/execute`);
});
