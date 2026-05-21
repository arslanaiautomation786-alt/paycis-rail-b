import express, { Request, Response } from "express";
import crypto from "crypto";
import path from "path";
import { processMintRequest } from "../daemons/mintDaemon";
import { DepositAlert } from "../types";

const app = express();
app.use(express.json());

// Serve dashboard
app.use("/dashboard", express.static(
  path.join(__dirname, "../../src/dashboard")
));

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "paycis-secret-key";

// ── Signature Verification Middleware ──────────────────────────
function verifySignature(req: Request, res: Response, next: Function) {
  const signature = req.headers["x-paycis-signature"] as string;
  const payload = JSON.stringify(req.body);

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (!signature || signature !== expected) {
    console.warn("[RailA] ⚠️ Invalid signature — request rejected");
    return res.status(401).json({ error: "Invalid signature" });
  }

  next();
}

// ── Deposit Alert Endpoint ─────────────────────────────────────
app.post("/webhook/deposit", verifySignature, async (req: Request, res: Response) => {
  const body = req.body;

  if (!body.transactionToken || !body.amount || !body.destinationWallet) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const alert: DepositAlert = {
    transactionToken: body.transactionToken,
    amount: Number(body.amount),
    currency: body.currency || "USD",
    destinationWallet: body.destinationWallet,
    timestamp: body.timestamp || Date.now(),
  };

  console.log(`[RailA] ✅ Deposit alert received: ${alert.transactionToken}`);

  res.status(202).json({
    message: "Deposit alert accepted",
    transactionToken: alert.transactionToken,
    status: "QUEUED",
  });

  processMintRequest(alert).then((record) => {
    console.log(`[RailA] Pipeline complete:`, JSON.stringify(record, null, 2));
  }).catch((err) => {
    console.error(`[RailA] Pipeline error:`, err);
  });
});

// ── Status Check Endpoint ──────────────────────────────────────
app.get("/status/:token", async (req: Request, res: Response) => {
  const { getTokenStatus } = await import("../services/redisService");
  const token = Array.isArray(req.params.token) 
  ? req.params.token[0] 
  : req.params.token;
const status = await getTokenStatus(token);

  if (!status) {
    return res.status(404).json({ error: "Token not found" });
  }

  res.json({
    transactionToken: token,
    status,
  });
});

// ── Health Check ───────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    service: "PAYCIS Rail B", 
    timestamp: Date.now() 
  });
});

// ── Get All Transactions ───────────────────────────────────────
app.get("/transactions", async (_req: Request, res: Response) => {
  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
    });

    const keys = await client.keys("mint:*");
    const transactions = await Promise.all(
      keys.map(async (key) => ({
        transactionToken: key.replace("mint:", ""),
        status: await client.get(key),
      }))
    );

    await client.quit();
    res.json({ transactions });
  } catch (err) {
    console.error("[Transactions] Redis error:", err);
    res.status(500).json({ error: "Redis unavailable", transactions: [] });
  }
});

// ── Start Server ───────────────────────────────────────────────
export function startServer(port = 3000) {
  app.listen(port, () => {
    console.log(`🌐 Rail A Webhook Server running on port ${port}`);
  });
}