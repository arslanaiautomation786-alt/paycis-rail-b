import {
  Connection,
  PublicKey,
  clusterApiUrl,
  ConfirmedSignatureInfo,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Devnet for testing, mainnet-beta for production
const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl("devnet"),
  "confirmed"
);

// USDC mint address (devnet test token or mainnet USDC)
const USDC_MINT = new PublicKey(
  process.env.USDC_MINT_ADDRESS ||
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" // devnet USDC
);

export async function pollForUSDCArrival(
  walletAddress: string,
  expectedAmount: number,
  timeoutMs: number = 120000  // 2 min timeout
): Promise<string | null> {
  const wallet = new PublicKey(walletAddress);
  const deadline = Date.now() + timeoutMs;

  console.log(`[Solana] Polling wallet: ${walletAddress}`);

  while (Date.now() < deadline) {
    try {
      // Get recent signatures for this wallet
      const signatures: ConfirmedSignatureInfo[] =
        await connection.getSignaturesForAddress(wallet, { limit: 10 });

      for (const sig of signatures) {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx?.meta) continue;

        // Look through token balance changes
        const postBalances = tx.meta.postTokenBalances || [];
        for (const bal of postBalances) {
          if (
            bal.mint === USDC_MINT.toBase58() &&
            bal.owner === walletAddress
          ) {
            const uiAmount = bal.uiTokenAmount.uiAmount || 0;
            if (uiAmount >= expectedAmount) {
              console.log(`[Solana] USDC confirmed. Tx: ${sig.signature}`);
              return sig.signature; // Confirmed!
            }
          }
        }
      }
    } catch (err) {
      console.error("[Solana] Poll error:", err);
    }

    // Wait 5 seconds between polls
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.warn("[Solana] Timeout: USDC arrival not confirmed");
  return null;
}