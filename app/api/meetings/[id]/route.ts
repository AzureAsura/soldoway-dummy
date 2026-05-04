import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/meetings/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        campaign: true,
        sales: { select: { id: true, wallet_address: true, email: true } },
        payout: true,
      },
    });
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    return NextResponse.json(meeting);
  } catch (err) {
    console.error("[GET /api/meetings/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/meetings/[id]
// Supports two modes:
//   1. Business approves/rejects: { status: "APPROVED" | "REJECTED" }
//   2. Sales edits PENDING meeting fields: { _editFields: true, prospect_name, ... }
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    // Mode 2: edit PENDING meeting fields
    if (body._editFields === true) {
      if (meeting.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only PENDING meetings can be edited" },
          { status: 400 }
        );
      }
      const { prospect_name, prospect_contact, scheduled_at, notes } = body;
      const updated = await prisma.meeting.update({
        where: { id },
        data: {
          ...(prospect_name ? { prospect_name } : {}),
          ...(prospect_contact ? { prospect_contact } : {}),
          ...(scheduled_at ? { scheduled_at: new Date(scheduled_at) } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
      });
      return NextResponse.json(updated);
    }

    // Mode 1: status update (APPROVED / REJECTED)
    const { status } = body as { status: "APPROVED" | "REJECTED" };
    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "status must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }
    if (meeting.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only PENDING meetings can be approved or rejected" },
        { status: 400 }
      );
    }

    if (status === "REJECTED") {
      const updated = await prisma.meeting.update({
        where: { id },
        data: { status: "REJECTED" },
      });
      return NextResponse.json(updated);
    }

    // Approve — validate budget + capacity
    const campaign = meeting.campaign;
    if (campaign.status !== "ACTIVE") {
      return NextResponse.json({ error: "Campaign is not active" }, { status: 400 });
    }
    if (campaign.budget_used + campaign.reward_per_meeting > campaign.budget_total) {
      return NextResponse.json({ error: "Campaign budget exhausted" }, { status: 400 });
    }
    if (campaign.meetings_used >= campaign.meeting_capacity) {
      return NextResponse.json({ error: "Campaign meeting capacity reached" }, { status: 400 });
    }

    const updated = await prisma.meeting.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/meetings/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/meetings/[id] — Sales deletes a PENDING meeting
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    if (meeting.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only PENDING meetings can be deleted" },
        { status: 400 }
      );
    }
    await prisma.meeting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/meetings/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
