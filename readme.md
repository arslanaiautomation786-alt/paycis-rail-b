# PAYCIS Rail B — Blockchain Minting Daemon

A production-grade USDC minting pipeline built with Node.js/TypeScript.
Handles deposit alerts, Circle Mint API automation, Redis idempotency 
guards, and Solana on-chain confirmation tracking.

---

## Architecture
Bank Deposit (Rail A)
↓
Webhook Server (Express)
↓
Redis Idempotency Check
↓
Circle Mint API → USDC Generated
↓
Solana On-Chain Tracker
↓
Status: TOKENIZED ✅

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Web Server | Express.js |
| Caching | Redis (ioredis) |
| Stablecoin | Circle Mint API (USDC) |
| Blockchain | Solana Web3.js |
| Security | HMAC-SHA256 Webhook Signatures |

---

## Project Structure
src/
├── webhooks/
│   └── railAServer.ts       # Express webhook server
├── daemons/
│   └── mintDaemon.ts        # Core pipeline orchestrator
├── services/
│   ├── circleService.ts     # Circle Mint API consumer
│   ├── redisService.ts      # Idempotency cache layer
│   └── solanaService.ts     # On-chain USDC tracker
├── types/
│   └── index.ts             # Shared TypeScript types
├── testWebhook.ts           # Integration test script
└── index.ts                 # Entry point

---

## Setup

### Prerequisites
- Node.js 18+
- Redis server
- WSL2 (Windows) or Linux/Mac

### Install
```bash
git clone https://github.com/yourname/paycis-rail-b
cd paycis-rail-b
npm install
```

### Configure `.env`
```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
WEBHOOK_SECRET=paycis-secret-key
CIRCLE_API_KEY=your_circle_key_here
CIRCLE_API_URL=https://api-sandbox.circle.com
SOLANA_RPC_URL=https://api.devnet.solana.com
USDC_MINT_ADDRESS=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### Start Redis (WSL2)
```bash
wsl
sudo service redis-server start
```

### Run
```bash
npm run dev
```

---

## API Endpoints

### POST `/webhook/deposit`
Receives deposit alerts from Rail A.

**Headers:**
Content-Type: application/json
x-paycis-signature: <hmac-sha256-signature>

**Body:**
```json
{
  "transactionToken": "TXN-1234567890",
  "amount": 500.00,
  "currency": "USD",
  "destinationWallet": "SolanaWalletAddress",
  "timestamp": 1716289200000
}
```

**Response:**
```json
{
  "message": "Deposit alert accepted",
  "transactionToken": "TXN-1234567890",
  "status": "QUEUED"
}
```

---

### GET `/status/:token`
Query the current mint status of a transaction.

**Response:**
```json
{
  "transactionToken": "TXN-1234567890",
  "status": "MINT_CONFIRMED"
}
```

**Status Values:**
| Status | Meaning |
|---|---|
| `PENDING` | Registered, not yet processed |
| `MINT_REQUESTED` | Circle API called |
| `MINT_CONFIRMED` | Circle approved the mint |
| `TOKENIZED` | USDC confirmed on Solana |
| `FAILED` | Error at any stage |

---

### GET `/health`
Service health check.

```json
{ "status": "ok", "service": "PAYCIS Rail B" }
```

---

## Security

- All webhook requests verified via **HMAC-SHA256 signature**
- API keys stored in `.env` — never hardcoded
- Redis idempotency guard prevents **double-minting**
- Every transaction token locked immediately on receipt

---

## Testing

```bash
# Terminal 1 — start server
npm run dev

# Terminal 2 — fire test alert
npm run test:webhook
```

---

## Mint Status Flow
PENDING → MINT_REQUESTED → MINT_CONFIRMED → TOKENIZED
↓
FAILED (on error or timeout)

---

## License
ISC
