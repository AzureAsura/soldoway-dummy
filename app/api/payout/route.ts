import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/payout
// Business triggers approvePayout() on-chain after approving a meeting.
// Validations per spec:
//  1. Meeting status must be APPROVED
//  2. Campaign status must be ACTIVE
//  3. budget_used + reward_per_meeting <= budget_total
//  4. No successful payout already exists for this meeting
//  5. Only Business owner of the campaign can trigger
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { meeting_id, business_id } = body as { meeting_id: string; business_id: string };

    if (!meeting_id || !business_id) {
      return NextResponse.json(
        { error: "Missing meeting_id or business_id" },
        { status: 400 }
      );
    }

    // 1. Fetch meeting with campaign and payout
    const meeting = await prisma.meeting.findUnique({
      where: { id: meeting_id },
      include: { campaign: true, payout: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Validation 1: meeting status must be APPROVED
    if (meeting.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Meeting must be APPROVED before payout" },
        { status: 400 }
      );
    }

    const campaign = meeting.campaign;

    // Validation 5: only business owner can trigger
    if (campaign.business_id !== business_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validation 2: campaign must be ACTIVE
    if (campaign.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Campaign is not ACTIVE" },
        { status: 400 }
      );
    }

    // Validation 4: no successful payout yet
    if (meeting.payout && meeting.payout.status === "SUCCESS") {
      return NextResponse.json(
        { error: "Payout already completed for this meeting" },
        { status: 400 }
      );
    }

    // Validation 3: budget check
    const amount = campaign.reward_per_meeting;
    if (campaign.budget_used + amount > campaign.budget_total) {
      return NextResponse.json(
        { error: "Campaign budget exhausted" },
        { status: 400 }
      );
    }

    // 2. Get Sales user's wallet address
    const salesUser = await prisma.user.findUnique({
      where: { id: meeting.sales_id },
    });
    if (!salesUser) {
      return NextResponse.json({ error: "Sales user not found" }, { status: 404 });
    }

    // 3. Execute on-chain approvePayout() via server wallet
    const serverWalletKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!serverWalletKey) {
      return NextResponse.json({ error: "Server wallet not configured" }, { status: 500 });
    }

    const {
      Connection,
      Keypair,
      PublicKey,
      SystemProgram,
      Transaction,
      sendAndConfirmTransaction,
    } = require("@solana/web3.js");

    const secretKey = Uint8Array.from(JSON.parse(serverWalletKey));
    const serverKeypair = Keypair.fromSecretKey(secretKey);
    const rpcUrl =
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    let salesPubkey: typeof PublicKey;
    try {
      salesPubkey = new PublicKey(salesUser.wallet_address);
    } catch {
      return NextResponse.json(
        { error: "Invalid sales wallet address" },
        { status: 400 }
      );
    }

    const lamports = Math.floor(amount * 1e9);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: serverKeypair.publicKey,
        toPubkey: salesPubkey,
        lamports,
      })
    );

    let signature = "";
    const toastId = "payout-tx";
    try {
      signature = await sendAndConfirmTransaction(connection, tx, [serverKeypair]);
    } catch (txErr: unknown) {
      console.error("[approvePayout] on-chain tx failed:", txErr);
      return NextResponse.json(
        { error: "On-chain payout transaction failed" },
        { status: 500 }
      );
    }

    // 4. Record payout and update campaign budget + meetings_used atomically
    const newMeetingsUsed = campaign.meetings_used + 1;
    const newStatus =
      newMeetingsUsed >= campaign.meeting_capacity ? "CLOSED" : "ACTIVE";

    const [payout] = await prisma.$transaction([
      // Create or update payout record
      ...(meeting.payout
        ? [
            prisma.payout.update({
              where: { id: meeting.payout.id },
              data: { tx_signature: signature, status: "SUCCESS" },
            }),
          ]
        : [
            prisma.payout.create({
              data: {
                meeting_id,
                sales_id: meeting.sales_id,
                amount,
                tx_signature: signature,
                status: "SUCCESS",
              },
            }),
          ]),
      // Update campaign budget_used, meetings_used, and status
      prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          budget_used: { increment: amount },
          meetings_used: { increment: 1 },
          status: newStatus,
        },
      }),
    ]);

    return NextResponse.json(
      { payout, signature, tx_signature: signature },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/payout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
