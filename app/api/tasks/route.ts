import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { badRequest } from "@/lib/api";
import type { CreateTaskInput } from "@/types";

// GET /api/tasks — list all ACTIVE tasks (for Sales to browse)
export async function GET(_req: NextRequest) {
  try {
    const tasks = await prisma.task.findMany({
      where: { status: "ACTIVE" },
      include: { business: { select: { id: true, wallet_address: true, email: true } } },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks — create a new task (Business only)
// Note: on-chain create_task() is called from the client before hitting this endpoint.
// The escrow_pda is passed in after on-chain confirmation.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateTaskInput & {
      businessId: string;
      escrowPda: string;
    };

    const { title, description, reward_amount, budget_total, businessId, escrowPda } = body;

    if (!title || !reward_amount || !budget_total || !businessId || !escrowPda) {
      return badRequest("Missing required fields");
    }

    if (reward_amount <= 0 || budget_total <= 0) {
      return badRequest("reward_amount and budget_total must be positive");
    }

    if (reward_amount > budget_total) {
      return badRequest("reward_amount cannot exceed budget_total");
    }

    const task = await prisma.task.create({
      data: {
        business_id: businessId,
        title,
        description,
        reward_amount,
        budget_total,
        escrow_pda: escrowPda,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
