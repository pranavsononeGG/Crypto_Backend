# Crypto Backend - limit-order-parser
**Live Demo Hosted on Render:** [https://crypto-backend-uync.onrender.com/](https://crypto-backend-uync.onrender.com/)
A high-performance backend system for processing crypto orders, built with Node.js, Fastify, BullMQ, and Redis.

## Design Decisions

- **Framework**: [Fastify](https://www.fastify.io/) was chosen for its low overhead and high performance, essential for a high-frequency trading context.
- **Asynchronous Processing**: [BullMQ](https://docs.bullmq.io/) (backed by Redis) is used to decouple API ingestion from order execution. This allows the system to accept bursts of traffic without slowing down, putting orders into a durable queue for processing workers.
- **Real-time Updates**: A combination of Redis Pub/Sub and WebSockets ensures that clients receive immediate feedback on order status changes without polling.
- **Scalability**: The separation of the Web Server (Producer) and the Worker (Consumer) allows these components to scale independently based on load.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Redis (running on default port 6379 or configured via `.env`)
- PostgreSQL

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment:
    Create a `.env` file (or use defaults in `config/`):
    ```env
    REDIS_URL=redis://localhost:6379
    DATABASE_URL=postgresql://user:password@localhost:5432/dbname
    PORT=3000
    ```

### Running the Application

You can use the included `Makefile` to simplify common operations.

*   **Start Infrastructure (Redis + Postgres)**:
    ```bash
    make up
    ```
*   **Stop Infrastructure**:
    ```bash
    make down
    ```
*   **Development Mode** (Starts DBs and runs the server):
    ```bash
    make dev
    ```
*   **Start Server Only**:
    ```bash
    make server
    ```
*   **Run Tests**:
    ```bash
    make test
    ```

Alternatively, you can use `npm` scripts:
*   `npm run dev` (Development)
*   `npm start` (Production)
*   `npm test` (Testing)

---

## Scripts Folder

The `scripts/` directory contains utility scripts for testing and verifying the system manually:

1.  **`test-db.ts`**: Verifies connectivity to the PostgreSQL database.
2.  **`test-execution.ts`**: detailed script to submit a mock order via HTTP to the `POST /api/orders/execute` endpoint and log the response.
3.  **`test-websocket.ts`**: complete end-to-end integration script that connects to the WebSocket, submits an order, subscribes to updates, and waits for the "confirmed" or "failed" status.

To run any script:
```bash
npx ts-node scripts/script-name.ts
```

---

## Test Suite

The project includes a comprehensive test suite covering routing, queue processing, and real-time updates.

### Running Tests
To run all tests:
```bash
make test
# OR
npm test
```

### Included Tests & Functionality

1.  **Smart Router (`src/__tests__/smartRouter.test.ts`)**
    *   **Type**: Unit Test
    *   **Focus**: Verifies the order routing logic finding the best price across multiple DEXs (Raydium, Meteora).
    *   **Key Checks**: Ensures the router properly compares tokens and selects the DEX with the best output amount.

2.  **Order Processor (`src/__tests__/orderProcessor.test.ts`)**
    *   **Type**: Unit Test (Mocked Queue)
    *   **Focus**: Validates that orders are correctly validated, added to the BullMQ queue, and that the initial "pending" status is published via Redis.
    *   **Key Checks**: Verifies `queue.add()` parameters and Redis Pub/Sub notification format.

3.  **Order Queue Integration (`src/__tests__/orderQueue.test.ts`)**
    *   **Type**: Integration Test
    *   **Focus**: Tests the full lifecycle of a job from the Queue to the Worker.
    *   **Key Checks**: Uses a real Redis instance (test queue) to verify the worker picks up the job, simulates processing delay, updates status transitions (`routing` -> `submitted` -> `confirmed`), and completes the job.

4.  **WebSocket Integration (`src/__tests__/websocket.test.ts`)**
    *   **Type**: End-to-End / Integration Test
    *   **Focus**: Verifies real-time communication between the server and the client.
    *   **Key Checks**: 
        *   Connects a real WebSocket client to the running Fastify server.
        *   Subscribes to specific `orderId` updates.
        *   Triggers a Redis Pub/Sub message simulating a worker update.
        *   Asserts the WebSocket client receives the correct order update from the server in real-time.

---

## Order Engine Extensibility

### Why Limit Order is the Baseline
The **Limit Order** logic serves as the perfect baseline because it implements the rigorous superset of execution requirements: **Intent + Constraints**. A Limit order represents an intent to trade ("Buy 1 BTC") constrained by a parameter ("at $50,000 or better").

- **Market Orders** are simply subsets of Limit Orders where the price constraint is removed (or set to infinite bounds), requiring only execution availability (liquidity).
- **Sniper Orders** are Limit Orders with *additional* temporal or environmental constraints (e.g., "Buy at $50k, but only after Block #1000" or "only at 12:00:00 PM").

### Extending to Market and Sniper Types
To extend the engine, we modify the validation and trigger execution logic:

1.  **Market Orders**: We bypass the "Price vs. Market Price" comparison check entirely. We validate only for quantity availability and execute immediately against the best available order book depth.
2.  **Sniper Orders**: We wrap the Limit Order logic with a **Trigger Condition**.
    *   **How we check**: The worker checks the specific trigger condition (Time >= `targetTime` OR BlockHeight >= `targetBlock`) before attempting the price check.
    *   **Frequency**: 
        *   **Time-based**: The queue utilizes a logical check every **100ms** (or the queue's `delay` feature can schedule the job exactly for `targetTime`).
        *   **Block-based**: The engine listens to the blockchain provider's websocket stream for new blocks; checking the condition exactly **once per new block execution** (e.g., every ~12s for Ethereum or ~400ms for Solana).
