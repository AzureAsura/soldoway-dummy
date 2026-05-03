import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { badRequest, unauthorized } from "@/lib/api";
import type { Role } from "@/types";

// POST /api/auth/onboard
// Called after Privy login to create/update user and assign role
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { role?: Role; privyUserId?: string; walletAddress?: string };

    const { role, privyUserId, walletAddress } = body;

    if (!role || !privyUserId || !walletAddress) {
      return badRequest("Missing required fields: role, privyUserId, walletAddress");
    }

    if (role !== "BUSINESS" && role !== "SALES") {
      return badRequest("Invalid role. Must be BUSINESS or SALES.");
    }

    // Upsert user — safe to call multiple times
    const user = await prisma.user.upsert({
      where: { id: privyUserId },
      create: {
        id: privyUserId,
        wallet_address: walletAddress,
        role,
      },
      update: {
        wallet_address: walletAddress,
      },
    });

    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    console.error("[POST /api/auth/onboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
