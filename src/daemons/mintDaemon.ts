// THE CORE DAEMON — ties everything together

import { DepositAlert, MintRecord } from "../types";
import {
  checkDuplicate,
  registerToken,
  updateTokenStatus,
} from "../services/redisService";
import { requestMint } from "../services/circleService";
import { pollForUSDCArrival } from "../services/solanaService";

export async function processMintRequest(
  alert: DepositAlert
): Promise<MintRecord> {
  const record: MintRecord = {
    transactionToken: alert.transactionToken,
    status: "PENDING",
  };

  // ─── GATE 1: IDEMPOTENCY CHECK ───────────────────────────────
  const isDuplicate = await checkDuplicate(alert.transactionToken);
  if (isDuplicate) {
    console.warn(
      `[MintDaemon] DUPLICATE DROPPED: ${alert.transactionToken}`
    );
    record.status = "FAILED";
    return record; // Hard stop — do NOT proceed
  }

  // Register immediately to lock the token
  await registerToken(alert.transactionToken, "PENDING");

  // ─── GATE 2: CIRCLE MINT REQUEST ────────────────────────────
  try {
    console.log(`[MintDaemon] Requesting mint for ${alert.amount} USD`);
    record.status = "MINT_REQUESTED";
    await updateTokenStatus(alert.transactionToken, "MINT_REQUESTED");

    const mintResponse = await requestMint(
      alert.transactionToken,
      alert.amount,
      alert.destinationWallet
    );

    record.circlePaymentId = mintResponse.id;
    record.status = "MINT_CONFIRMED";
    record.mintedAt = Date.now();
    await updateTokenStatus(alert.transactionToken, "MINT_CONFIRMED");

    console.log(`[MintDaemon] Mint confirmed. Circle ID: ${mintResponse.id}`);
  } catch (err) {
    console.error("[MintDaemon] Circle mint failed:", err);
    record.status = "FAILED";
    await updateTokenStatus(alert.transactionToken, "FAILED");
    return record;
  }

  // ─── GATE 3: SOLANA ON-CHAIN CONFIRMATION ───────────────────
  const txSig = await pollForUSDCArrival(
    alert.destinationWallet,
    alert.amount
  );

  if (txSig) {
    record.solanaTxSignature = txSig;
    record.status = "TOKENIZED";
    record.tokenizedAt = Date.now();
    await updateTokenStatus(alert.transactionToken, "TOKENIZED");
    console.log(`[MintDaemon] ✅ TOKENIZED — Sig: ${txSig}`);
  } else {
    record.status = "FAILED";
    await updateTokenStatus(alert.transactionToken, "FAILED");
    console.error("[MintDaemon] ❌ Solana confirmation timeout");
  }

  return record;
}