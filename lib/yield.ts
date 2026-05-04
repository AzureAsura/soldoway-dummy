/**
 * Mock yield calculation per spec: MOCK_APY = 5%
 * yield = deposit_amount * 0.05 * (days_since_deposit / 365)
 * total_claimable = remaining_budget + yield
 */

export const MOCK_APY = 0.05; // 5% APY as per spec

/**
 * Calculate mock yield earned on a deposit since a given timestamp.
 * @param depositedSol  - Amount deposited (or remaining) in SOL
 * @param depositedAt   - Timestamp of the deposit
 * @returns Estimated yield in SOL
 */
export function calculateMockYield(
  depositedSol: number,
  depositedAt: Date
): number {
  const msSinceDeposit = Date.now() - depositedAt.getTime();
  const daysSinceDeposit = msSinceDeposit / (1000 * 60 * 60 * 24);
  return Math.max(0, depositedSol * MOCK_APY * (daysSinceDeposit / 365));
}

/**
 * Total claimable = remaining_budget + yield mock
 */
export function calculateTotalClaimable(
  remainingBudget: number,
  depositedAt: Date
): number {
  return remainingBudget + calculateMockYield(remainingBudget, depositedAt);
}

/** Convert SOL to lamports */
export function solToLamports(sol: number): number {
  return Math.round(sol * 1e9);
}

/** Convert lamports to SOL */
export function lamportsToSol(lamports: number): number {
  return lamports / 1e9;
}

/** Format SOL with up to 6 decimal places */
export function formatSol(sol: number): string {
  return sol.toFixed(6);
}
