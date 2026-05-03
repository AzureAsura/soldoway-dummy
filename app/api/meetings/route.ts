import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { badRequest } from "@/lib/api";
import type { CreateMeetingInput } from "@/types";

// GET /api/meetings — list meetings for the authenticated sales user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salesId = searchParams.get("salesId");
    const taskId = searchParams.get("taskId");

    const meetings = await prisma.meeting.findMany({
      where: {
        ...(salesId ? { sales_id: salesId } : {}),
        ...(taskId ? { task_id: taskId } : {}),
      },
      include: {
        task: { select: { id: true, title: true, reward_amount: true } },
        sales: { select: { id: true, wallet_address: true, email: true } },
        payout: true,
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(meetings);
  } catch (err) {
    console.error("[GET /api/meetings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/meetings — create a new meeting (Sales only)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateMeetingInput & { salesId: string };

    const { task_id, prospect_name, scheduled_at, calendar_event_id, salesId } = body;

    if (!task_id || !prospect_name || !scheduled_at || !salesId) {
      return badRequest("Missing required fields: task_id, prospect_name, scheduled_at, salesId");
    }

    // Verify task is still active and has budget remaining
    const task = await prisma.task.findUnique({ where: { id: task_id } });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== "ACTIVE") return badRequest("Task is no longer active");
    if (task.budget_used + task.reward_amount > task.budget_total) {
      return badRequest("Task budget is exhausted");
    }

    const meeting = await prisma.meeting.create({
      data: {
        task_id,
        sales_id: salesId,
        prospect_name,
        scheduled_at: new Date(scheduled_at),
        calendar_event_id,
        status: "PENDING",
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    console.error("[POST /api/meetings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
