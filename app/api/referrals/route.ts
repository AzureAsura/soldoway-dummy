import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const referrerId = searchParams.get("referrerId");

    if (!referrerId) {
      return NextResponse.json({ error: "Missing referrerId" }, { status: 400 });
    }

    // Get the user to get their wallet address for the referral link
    const user = await prisma.user.findUnique({
      where: { id: referrerId },
      include: {
        referrals: {
          select: {
            id: true,
            wallet_address: true,
            email: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' }
        },
        referral_rewards_given: {
          include: {
            meeting: {
              include: {
                campaign: { select: { title: true } }
              }
            }
          },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const totalReward = user.referral_rewards_given.reduce((sum, reward) => sum + reward.amount, 0);

    return NextResponse.json({
      referral_code: user.referral_code || user.wallet_address,
      total_reward: totalReward,
      referred_users: user.referrals,
      rewards: user.referral_rewards_given,
    });
  } catch (err) {
    console.error("[GET /api/referrals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
