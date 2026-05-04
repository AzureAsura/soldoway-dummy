import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/tasks — redirect to /api/campaigns (backward compat)
export async function GET(_req: NextRequest) {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { status: "ACTIVE" },
      include: {
        business: { select: { id: true, wallet_address: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(campaigns);
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks — redirect to /api/campaigns
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      title,
      company = "Unknown",
      category = "Other",
      description,
      reward_amount,
      budget_total,
      escrowPda,
    } = body;

    if (!title || !reward_amount || !budget_total || !businessId || !escrowPda) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        business_id: businessId,
        title,
        company,
        category,
        description,
        reward_per_meeting: reward_amount,
        meeting_capacity: Math.floor(budget_total / reward_amount),
        budget_total,
        escrow_pda: escrowPda,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
