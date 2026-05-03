import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/api";
import type { PayoutRequest } from "@/types";

// POST /api/payout
// Triggered after Sales submits PRODUCTIVE outcome.
// Server wallet signs the on-chain payout() instruction.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PayoutRequest;
    const { meeting_id } = body;

    if (!meeting_id) return badRequest("Missing meeting_id");

    // 1. Fetch meeting and validate it's eligible for payout
    const meeting = await prisma.meeting.findUnique({
      where: { id: meeting_id },
      include: { task: true, payout: true },
    });

    if (!meeting) return notFound("Meeting");
    if (meeting.outcome !== "PRODUCTIVE") {
      return badRequest("Meeting outcome is not PRODUCTIVE");
    }
    if (meeting.status !== "DONE") {
      return badRequest("Meeting is not in DONE status");
    }
    if (meeting.payout) {
      return badRequest("Payout already exists for this meeting");
    }

    // 2. Check task budget
    const task = meeting.task;
    if (task.budget_used + task.reward_amount > task.budget_total) {
      return badRequest("Task budget is exhausted");
    }

    // 3. Instead of transferring immediately, we allocate the reward as PENDING.
    // This allows the Sales rep to batch claim their rewards using the "Claim" button.
    const [payout] = await prisma.$transaction([
      prisma.payout.create({
        data: {
          meeting_id,
          sales_id: meeting.sales_id,
          amount: task.reward_amount,
          tx_signature: "PENDING_CLAIM",
          status: "PENDING",
        },
      }),
      prisma.task.update({
        where: { id: task.id },
        data: { budget_used: { increment: task.reward_amount } },
      }),
    ]);

    return NextResponse.json(payout, { status: 201 });
  } catch (err) {
    console.error("[POST /api/payout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
