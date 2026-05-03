/**
 * Mock yield calculation for Devnet (Kamino SDK not available on Devnet).
 * Simulates ~7.2% APY compounded daily.
 */

const MOCK_APY = 0.072; // 7.2% APY

/**
 * Calculate mock yield earned on a deposit since a given date.
 * @param depositedSol - Amount deposited in SOL
 * @param depositedAt  - Timestamp of the deposit
 * @returns Estimated yield in SOL
 */
export function calculateMockYield(
  depositedSol: number,
  depositedAt: Date
): number {
  const nowMs = Date.now();
  const depositMs = depositedAt.getTime();
  const daysElapsed = (nowMs - depositMs) / (1000 * 60 * 60 * 24);

  // Compound daily: P * ((1 + r/365)^days - 1)
  const dailyRate = MOCK_APY / 365;
  const yieldAmount = depositedSol * (Math.pow(1 + dailyRate, daysElapsed) - 1);

  return Math.max(0, yieldAmount);
}

/**
 * Format SOL amount with up to 6 decimal places.
 */
export function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(6);
}

/**
 * Convert SOL to lamports.
 */
export function solToLamports(sol: number): number {
  return Math.round(sol * 1e9);
}

/**
 * Convert lamports to SOL.
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1e9;
}
