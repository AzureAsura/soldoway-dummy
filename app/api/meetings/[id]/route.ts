import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/api";
import type { UpdateMeetingInput } from "@/types";

type Params = { params: Promise<{ id: string }> };

// GET /api/meetings/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        task: true,
        sales: { select: { id: true, wallet_address: true, email: true } },
        payout: true,
      },
    });

    if (!meeting) return notFound("Meeting");
    return NextResponse.json(meeting);
  } catch (err) {
    console.error("[GET /api/meetings/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/meetings/[id] — Sales submits outcome (Productive / Not Productive)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as UpdateMeetingInput;

    const { outcome, notes } = body;

    if (!outcome) return badRequest("Missing outcome field");
    if (outcome !== "PRODUCTIVE" && outcome !== "NOT_PRODUCTIVE") {
      return badRequest("outcome must be PRODUCTIVE or NOT_PRODUCTIVE");
    }

    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) return notFound("Meeting");
    if (meeting.status === "DONE") return badRequest("Meeting outcome already submitted");

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        outcome,
        notes,
        status: "DONE",
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/meetings/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
