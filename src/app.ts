import express from 'express';
import bodyParser from 'body-parser';
import { executeOrder } from './controllers/orderController';

const app = express();

app.use(bodyParser.json());

app.post('/api/orders/execute', executeOrder);

export default app;
