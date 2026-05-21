import crypto from "crypto";
import axios from "axios";

const SECRET = "paycis-secret-key";
const PORT = 3000;

const payload = {
  transactionToken: `TXN-${Date.now()}`,
  amount: 750.00,
  currency: "USD",
  destinationWallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  timestamp: Date.now(),
};

const signature = crypto
  .createHmac("sha256", SECRET)
  .update(JSON.stringify(payload))
  .digest("hex");

async function sendTestAlert() {
  console.log("📤 Sending test deposit alert...");
  
  const res = await axios.post(
    `http://localhost:3000/webhook/deposit`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        "x-paycis-signature": signature,
      },
    }
  );

  console.log("✅ Response:", res.data);

  // Check status after 3 seconds
  setTimeout(async () => {
    const status = await axios.get(
      `http://localhost:3000/status/${payload.transactionToken}`
    );
    console.log("📋 Status:", status.data);
  }, 3000);
}

sendTestAlert().catch(console.error);