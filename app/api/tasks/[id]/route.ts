import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notFound } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// GET /api/tasks/[id] — backward compat, uses campaign table
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, wallet_address: true, email: true } },
        meetings: {
          include: {
            sales: { select: { id: true, wallet_address: true, email: true } },
            payout: true,
          },
          orderBy: { created_at: "desc" },
        },
        withdrawals: true,
      },
    });

    if (!campaign) return notFound("Campaign");
    return NextResponse.json(campaign);
  } catch (err) {
    console.error("[GET /api/tasks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
