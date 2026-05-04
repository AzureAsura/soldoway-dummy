import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/users — not used for listing; POST creates a new user after onboarding
// POST /api/users — save new user after onboarding (called from onboarding page)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, wallet_address, role, email } = body;

    if (!id || !wallet_address || !role) {
      return NextResponse.json(
        { error: "Missing required fields: id, wallet_address, role" },
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
      where: { id },
      create: { id, wallet_address, role, email },
      update: { wallet_address, email },
    });

    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    console.error("[POST /api/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
