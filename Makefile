.PHONY: up down restart test server dev

# Start Infrastructure (Redis + Postgres)
up:
	docker start crypto-redis crypto-pg

# Stop Infrastructure
down:
	docker stop crypto-redis crypto-pg

# Restart Infrastructure
restart: down up

# Run Tests
test:
	npm test

# Start Server (Worker runs inside)
server:
	npx ts-node src/server.ts

# Development Mode (Ensure DBs up -> Start Server)
dev: up server
