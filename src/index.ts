import dotenv from "dotenv";
dotenv.config(); // ← MUST be first line before any other imports

import { startServer } from "./webhooks/railAServer";

async function main() {
  console.log("🚀 PAYCIS Rail B Daemon starting...");
  startServer(3000);
  console.log("⏳ Waiting for deposit alerts...");
  console.log("📡 POST http://localhost:3000/webhook/deposit");
  console.log("🔍 GET  http://localhost:3000/status/:token");
  console.log("💚 GET  http://localhost:3000/health");
}

main().catch(console.error);