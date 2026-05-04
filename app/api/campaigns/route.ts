import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { CreateCampaignInput } from "@/types";

// GET /api/campaigns — list all ACTIVE campaigns (Sales marketplace)
export async function GET(_req: NextRequest) {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { status: "ACTIVE" },
      include: {
        business: { select: { id: true, wallet_address: true, email: true } },
        _count: { select: { meetings: true } },
      },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(campaigns);
  } catch (err) {
    console.error("[GET /api/campaigns]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/campaigns — Business creates a new campaign
// On-chain createCampaign() is called from the client first; escrow_pda + tx_signature passed in after confirmation.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateCampaignInput & {
      businessId: string;
      escrowPda: string;
      txSignature?: string;
    };

    const {
      businessId,
      title,
      company,
      category,
      description,
      reward_per_meeting,
      meeting_capacity,
      budget_total,
      escrowPda,
      txSignature,
    } = body;

    if (
      !businessId ||
      !title ||
      !company ||
      !category ||
      !reward_per_meeting ||
      !meeting_capacity ||
      !budget_total ||
      !escrowPda
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (reward_per_meeting <= 0 || budget_total <= 0 || meeting_capacity <= 0) {
      return NextResponse.json(
        { error: "Numeric fields must be positive" },
        { status: 400 }
      );
    }

    if (reward_per_meeting * meeting_capacity > budget_total) {
      return NextResponse.json(
        { error: "budget_total must cover at least meeting_capacity × reward_per_meeting" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        business_id: businessId,
        title,
        company,
        category,
        description,
        reward_per_meeting,
        meeting_capacity,
        budget_total,
        escrow_pda: escrowPda,
        tx_signature: txSignature ?? null,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    console.error("[POST /api/campaigns]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
