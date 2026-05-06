import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { CreateMeetingInput } from "@/types";

// GET /api/meetings — list meetings for the authenticated sales user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salesId = searchParams.get("salesId");
    const campaignId = searchParams.get("campaignId");

    if (!salesId && !campaignId) {
      return NextResponse.json(
        { error: "Provide salesId or campaignId query param" },
        { status: 400 }
      );
    }

    const meetings = await prisma.meeting.findMany({
      where: {
        ...(salesId ? { sales_id: salesId } : {}),
        ...(campaignId ? { campaign_id: campaignId } : {}),
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            company: true,
            reward_per_meeting: true,
          },
        },
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

// POST /api/meetings — Sales submits a new meeting to a campaign
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateMeetingInput & { salesId: string };

    const {
      campaign_id,
      prospect_name,
      prospect_contact,
      scheduled_at,
      notes,
      salesId,
    } = body;

    if (!campaign_id || !prospect_name || !prospect_contact || !scheduled_at || !salesId) {
      return NextResponse.json(
        { error: "Missing required fields: campaign_id, prospect_name, prospect_contact, scheduled_at, salesId" },
        { status: 400 }
      );
    }

    // Verify campaign is still ACTIVE and has capacity
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaign_id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (campaign.status !== "ACTIVE") {
      return NextResponse.json({ error: "Campaign is no longer active" }, { status: 400 });
    }
    if (campaign.meetings_used >= campaign.meeting_capacity) {
      return NextResponse.json({ error: "Campaign has reached its meeting capacity" }, { status: 400 });
    }

    // ── Cal.com availability check (BEFORE saving to DB) ────────────────────
    // Only block when CAL_API_KEY is configured. If not set or Cal.com is down,
    // we fall through and save the meeting anyway (non-blocking).
    if (process.env.CAL_API_KEY) {
      try {
        const eventTypeId = process.env.CAL_EVENT_TYPE_ID
          ? parseInt(process.env.CAL_EVENT_TYPE_ID)
          : 5571740;

        const calResponse = await fetch("https://api.cal.com/v2/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CAL_API_KEY}`,
            "cal-api-version": "2024-08-13",
          },
          body: JSON.stringify({
            eventTypeId,
            // scheduled_at is already ISO 8601 UTC from the frontend — do NOT re-convert
            // (double conversion would shift the time by the server's UTC offset)
            start: scheduled_at,
            attendee: {
              name: prospect_name,
              email: prospect_contact.includes("@")
                ? prospect_contact
                : `${prospect_contact}@soldoway.app`,
              timeZone: "Asia/Jakarta",
            },
          }),
        });

        const calData = await calResponse.json();
        console.log("[Cal.com] booking response:", JSON.stringify(calData).slice(0, 300));

        // If Cal.com explicitly rejects due to availability → block the submission
        if (!calResponse.ok || calData.status === "error") {
          const errMsg: string = calData.error?.message ?? calData.message ?? JSON.stringify(calData);
          const isAvailabilityError =
            errMsg.toLowerCase().includes("already has booking") ||
            errMsg.toLowerCase().includes("not available");

          if (isAvailabilityError) {
            console.warn("[Cal.com] availability conflict — blocking meeting save:", errMsg);
            return NextResponse.json(
              {
                error: "CAL_SLOT_UNAVAILABLE",
                message: "This time slot is not available on Cal.com. Please choose a different time.",
              },
              { status: 409 }
            );
          }

          // Other Cal.com errors (non-availability) → save meeting anyway
          console.warn("[Cal.com] non-availability error (non-blocking):", errMsg);
          const meeting = await prisma.meeting.create({
            data: {
              campaign_id,
              sales_id: salesId,
              prospect_name,
              prospect_contact,
              scheduled_at: new Date(scheduled_at),
              notes: notes ?? null,
              status: "PENDING",
            },
            include: {
              campaign: { select: { id: true, title: true, company: true, reward_per_meeting: true } },
            },
          });
          const finalMeeting = { ...meeting, calendar_event_id: null, cal_error: errMsg };
          return NextResponse.json(finalMeeting, { status: 201 });
        }

        // Cal.com success → save meeting and store the uid
        const uid: string | null = calData?.data?.uid ?? calData?.uid ?? null;
        const meeting = await prisma.meeting.create({
          data: {
            campaign_id,
            sales_id: salesId,
            prospect_name,
            prospect_contact,
            scheduled_at: new Date(scheduled_at),
            notes: notes ?? null,
            status: "PENDING",
            ...(uid ? { calendar_event_id: uid } : {}),
          },
          include: {
            campaign: { select: { id: true, title: true, company: true, reward_per_meeting: true } },
          },
        });

        if (uid) {
          console.log("[Cal.com] booking created, uid:", uid);
        } else {
          console.warn("[Cal.com] booking succeeded but no uid in response");
        }

        return NextResponse.json({ ...meeting, calendar_event_id: uid, cal_error: null }, { status: 201 });

      } catch (calErr) {
        // Cal.com network/timeout errors → non-blocking, save meeting anyway
        console.error("[Cal.com] integration error (non-blocking):", calErr);
      }
    } else {
      console.log("[Cal.com] CAL_API_KEY not set, skipping booking.");
    }

    // Fallback path: CAL_API_KEY not set or Cal.com threw an unexpected error
    const meeting = await prisma.meeting.create({
      data: {
        campaign_id,
        sales_id: salesId,
        prospect_name,
        prospect_contact,
        scheduled_at: new Date(scheduled_at),
        notes: notes ?? null,
        status: "PENDING",
      },
      include: {
        campaign: { select: { id: true, title: true, company: true, reward_per_meeting: true } },
      },
    });

    return NextResponse.json({ ...meeting, calendar_event_id: null, cal_error: null }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/meetings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
