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

    let calendar_event_id = null;
    if (process.env.CAL_API_KEY) {
      try {
        const eventTypeId = process.env.CAL_EVENT_TYPE_ID
          ? parseInt(process.env.CAL_EVENT_TYPE_ID)
          : 5571740; // fallback to 30min event type
        const calResponse = await fetch('https://api.cal.com/v2/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CAL_API_KEY}`,
            'cal-api-version': '2024-08-13'
          },
          body: JSON.stringify({
            eventTypeId,
            start: scheduled_at,
            attendee: {
              name: prospect_name,
              email: prospect_contact.includes('@') ? prospect_contact : `${prospect_contact}@soldoway.app`,
              timeZone: 'Asia/Jakarta'
            }
          })
        });
        const calData = await calResponse.json();
        console.log('[Cal.com] booking response:', JSON.stringify(calData).slice(0, 300));
        
        // Cal.com v2 returns { status: "success", data: { uid: "..." } }
        const uid = calData?.data?.uid ?? calData?.uid ?? null;
        if (uid) {
          calendar_event_id = uid;
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { calendar_event_id }
          });
          console.log('[Cal.com] booking created, uid:', uid);
        } else {
          console.warn('[Cal.com] booking created but no uid in response:', JSON.stringify(calData).slice(0, 200));
        }
      } catch (err) {
        // Non-blocking: Cal.com errors must not prevent meeting submission
        console.error("[Cal.com] integration error (non-blocking):", err);
      }
    } else {
      console.log('[Cal.com] CAL_API_KEY not set, skipping booking.');
    }

    // Attach calendar_event_id to response
    const finalMeeting = { ...meeting, calendar_event_id };

    return NextResponse.json(finalMeeting, { status: 201 });
  } catch (err) {
    console.error("[POST /api/meetings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
