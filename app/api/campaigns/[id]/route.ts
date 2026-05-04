import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/campaigns/[id] — detail campaign with meetings + payouts
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

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (err) {
    console.error("[GET /api/campaigns/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/campaigns/[id] — update campaign status
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["ACTIVE", "CLOSED", "WITHDRAWN"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be ACTIVE, CLOSED, or WITHDRAWN." },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(campaign);
  } catch (err) {
    console.error("[PATCH /api/campaigns/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
