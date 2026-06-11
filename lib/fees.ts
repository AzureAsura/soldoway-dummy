/**
 * Platform fee configuration.
 * Using NEXT_PUBLIC_ prefix so these constants work in both server (API routes)
 * and client (UI components for display) without separate env vars.
 */
export const PLATFORM_FEE_RATE = Number(
  process.env.NEXT_PUBLIC_PLATFORM_FEE_RATE ?? 0.05
); // 5% of every meeting reward

export const REFERRER_SHARE_OF_FEE = Number(
  process.env.NEXT_PUBLIC_REFERRER_SHARE_OF_FEE ?? 0.2
); // Referrer's share of the platform fee (20% of fee = 1% net)

/**
 * Compute how a meeting reward is split between the sales rep, the platform,
 * and (optionally) a referrer.
 *
 * Rules:
 *  - Platform always takes PLATFORM_FEE_RATE of the reward.
 *  - If the rep has a referrer, REFERRER_SHARE_OF_FEE of the platform fee
 *    is redirected to that referrer; platform keeps the rest.
 *  - Sales rep always receives (1 − PLATFORM_FEE_RATE) of the reward.
 *
 * Example with defaults (5% fee, referrer gets 20% of fee):
 *  - Without referrer: rep 95%, platform 5%, referrer 0%
 *  - With referrer:    rep 95%, platform 4%, referrer 1%
 */
export function computePayoutSplit(
  reward: number,
  hasReferrer: boolean
): {
  salesAmount: number;  // SOL that goes to the sales rep
  fee: number;          // Total platform fee deducted from reward
  referrerCut: number;  // Portion of fee redirected to referrer
  platformCut: number;  // Portion of fee kept by the platform treasury
} {
  const fee = reward * PLATFORM_FEE_RATE;
  const referrerCut = hasReferrer ? fee * REFERRER_SHARE_OF_FEE : 0;
  const platformCut = fee - referrerCut;
  const salesAmount = reward - fee;
  return { salesAmount, fee, referrerCut, platformCut };
}
