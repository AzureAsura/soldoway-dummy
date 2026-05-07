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
// Business approves/rejects: { status: "APPROVED" | "REJECTED" }
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
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
      let calCancelled = false;
      const dbUpdatedData: { status: "REJECTED"; calendar_event_id?: string | null } = { status: "REJECTED" };

      if (meeting.calendar_event_id) {
        try {
          const calApiKey = process.env.CAL_API_KEY;
          if (calApiKey) {
            console.log(`[Cal.com] attempting to cancel booking uid: ${meeting.calendar_event_id}`);
            const calRes = await fetch(`https://api.cal.com/v2/bookings/${meeting.calendar_event_id}/cancel`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${calApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ cancellationReason: "Meeting rejected by Business on Soldoway" }),
            });

            if (calRes.ok) {
              console.log(`[Cal.com] booking uid ${meeting.calendar_event_id} cancelled successfully.`);
              calCancelled = true;
              dbUpdatedData.calendar_event_id = null;
            } else {
              const calText = await calRes.text();
              console.error(`[Cal.com] failed to cancel booking: ${calText}`);
            }
          } else {
            console.error("[Cal.com] CAL_API_KEY missing, skipping cancellation.");
          }
        } catch (calErr) {
          console.error("[Cal.com] network/parsing error during cancellation:", calErr);
        }
      }

      const updated = await prisma.meeting.update({
        where: { id },
        data: dbUpdatedData,
      });
      return NextResponse.json({ ...updated, cal_cancelled: calCancelled });
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

// DELETE /api/meetings/[id] — Cancel Cal.com booking (blocking) then delete DB row
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

    // ── Cancel Cal.com booking BEFORE deleting DB row (blocking) ────────────
    // If calendar_event_id is set and CAL_API_KEY is configured, we MUST cancel
    // the Cal.com booking first so the time slot is released.
    if (meeting.calendar_event_id && process.env.CAL_API_KEY) {
      const calUid = meeting.calendar_event_id;
      console.log("[Cal.com] attempting to cancel booking uid:", calUid);

      let calRes: Response;
      try {
        calRes = await fetch(
          `https://api.cal.com/v2/bookings/${calUid}/cancel`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.CAL_API_KEY}`,
              "cal-api-version": "2024-08-13",
            },
            body: JSON.stringify({
              cancellationReason: "Meeting deleted by Sales on Soldoway",
            }),
          }
        );
      } catch (networkErr) {
        // Network/DNS failure — log and continue so we still clean up the DB row
        console.error("[Cal.com] network error cancelling booking (continuing delete):", networkErr);
        await prisma.meeting.delete({ where: { id } });
        return NextResponse.json({ success: true, cal_cancelled: false });
      }

      // Log the full Cal.com response for debugging
      let calBody: unknown;
      try { calBody = await calRes.json(); } catch { calBody = null; }

      if (!calRes.ok) {
        // Log the reason but do NOT block the delete — the DB row must still go
        console.warn(
          `[Cal.com] cancel booking returned HTTP ${calRes.status} for uid ${calUid}:`,
          JSON.stringify(calBody)
        );
      } else {
        console.log(
          `[Cal.com] booking uid ${calUid} cancelled successfully:`,
          JSON.stringify(calBody)
        );
      }
    } else if (!meeting.calendar_event_id) {
      console.log("[Cal.com] no calendar_event_id on meeting, skipping cancel");
    } else {
      console.log("[Cal.com] CAL_API_KEY not set, skipping cancel");
    }

    await prisma.meeting.delete({ where: { id } });
    return NextResponse.json({ success: true, cal_cancelled: !!meeting.calendar_event_id });
  } catch (err) {
    console.error("[DELETE /api/meetings/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
