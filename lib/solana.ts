import { Connection, PublicKey } from "@solana/web3.js";

// Lazy-initialized — don't throw at module import time (breaks builds)
let _connection: Connection | null = null;
let _programId: PublicKey | null = null;

/** Get (or create) the shared Solana connection using Helius RPC */
export function getConnection(): Connection {
  if (_connection) return _connection;
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpcUrl) {
    throw new Error(
      "NEXT_PUBLIC_SOLANA_RPC_URL is not set. Use Helius RPC — never a public endpoint."
    );
  }
  _connection = new Connection(rpcUrl, "confirmed");
  return _connection;
}

/** Get the deployed Anchor program ID */
export function getProgramId(): PublicKey {
  if (_programId) return _programId;
  const id = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (!id) {
    throw new Error("NEXT_PUBLIC_PROGRAM_ID is not set.");
  }
  _programId = new PublicKey(id);
  return _programId;
}

/**
 * Derive the escrow PDA for a given task.
 * Seeds: ["escrow", task_id]
 */
export function deriveEscrowPDA(taskId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), Buffer.from(taskId)],
    getProgramId()
  );
  return pda;
}
