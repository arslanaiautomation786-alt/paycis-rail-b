export interface DepositAlert {
  transactionToken: string;   // Unique ID from Rail A
  amount: number;             // USD amount
  currency: string;           // "USD"
  destinationWallet: string;  // Solana wallet address
  timestamp: number;
}

export type MintStatus =
  | "PENDING"
  | "MINT_REQUESTED"
  | "MINT_CONFIRMED"
  | "TOKENIZED"
  | "FAILED";

export interface MintRecord {
  transactionToken: string;
  status: MintStatus;
  circlePaymentId?: string;
  solanaTxSignature?: string;
  mintedAt?: number;
  tokenizedAt?: number;
}