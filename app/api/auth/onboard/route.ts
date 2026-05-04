import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Role } from "@/types";

// POST /api/auth/onboard — kept for backward compatibility, delegates to /api/users
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      role?: Role;
      privyUserId?: string;
      walletAddress?: string;
    };

    const { role, privyUserId, walletAddress } = body;

    if (!role || !privyUserId || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: role, privyUserId, walletAddress" },
        { status: 400 }
      );
    }

    if (role !== "BUSINESS" && role !== "SALES") {
      return NextResponse.json(
        { error: "Invalid role. Must be BUSINESS or SALES." },
        { status: 400 }
      );
    }

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
