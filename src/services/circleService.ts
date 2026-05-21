import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const CIRCLE_BASE_URL = process.env.CIRCLE_API_URL || "https://api-sandbox.circle.com";
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || "your_sandbox_key_here";
const MOCK_MODE = !CIRCLE_API_KEY || CIRCLE_API_KEY === "your_sandbox_key_here";

interface MintResponse {
  id: string;
  status: string;
  amount: { amount: string; currency: string };
}

export async function requestMint(
  transactionToken: string,
  amountUSD: number,
  destinationWallet: string
): Promise<MintResponse> {

  // ── MOCK MODE (no real Circle key) ──────────────────────────
  if (MOCK_MODE) {
    console.log("[Circle] MOCK MODE — simulating mint approval");
    await new Promise((r) => setTimeout(r, 500));
    return {
      id: `MOCK-CIRCLE-${transactionToken}`,
      status: "confirmed",
      amount: { amount: amountUSD.toFixed(2), currency: "USD" },
    };
  }

  // ── REAL MODE (institutional Circle key) ────────────────────
  const payload = {
    idempotencyKey: transactionToken,
    amount: { amount: amountUSD.toFixed(2), currency: "USD" },
    destination: {
      type: "blockchain",
      address: destinationWallet,
      chain: "SOL",
    },
  };

  try {
    const response = await axios.post(
      `${CIRCLE_BASE_URL}/v1/mints`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${CIRCLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.data;
  } catch (err: any) {
    console.error("[Circle] API Error:", err?.response?.data || err.message);
    throw new Error(`Circle mint failed: ${err?.response?.data?.message || err.message}`);
  }
}