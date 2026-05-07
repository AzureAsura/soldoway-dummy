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

    // Validation 1: meeting must be PENDING (payout route sets it to APPROVED atomically)
    if (meeting.status !== "PENDING") {
      return NextResponse.json(
        { error: "Meeting must be PENDING before payout (already approved or rejected)" },
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

    // 2. Get Sales user's wallet address and referrer if any
    const salesUser = await prisma.user.findUnique({
      where: { id: meeting.sales_id },
      include: { referrer: true }
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

    let salesAmount = amount;
    let referrerBonus = 0;

    const tx = new Transaction();

    // Calculate referral split
    if (salesUser.referrer) {
      const platformFee = amount * 0.02;
      referrerBonus = platformFee * 0.5;
      salesAmount = amount - platformFee;

      const platformWallet = process.env.PLATFORM_WALLET_ADDRESS;
      if (platformWallet) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: serverKeypair.publicKey,
            toPubkey: new PublicKey(platformWallet),
            lamports: Math.floor(referrerBonus * 1e9),
          })
        );
      }

      tx.add(
        SystemProgram.transfer({
          fromPubkey: serverKeypair.publicKey,
          toPubkey: new PublicKey(salesUser.referrer.wallet_address),
          lamports: Math.floor(referrerBonus * 1e9),
        })
      );
    }

    // Add transfer to sales rep
    tx.add(
      SystemProgram.transfer({
        fromPubkey: serverKeypair.publicKey,
        toPubkey: salesPubkey,
        lamports: Math.floor(salesAmount * 1e9),
      })
    );

    let signature = "";
    try {
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = serverKeypair.publicKey;

      console.log(`[approvePayout] Sending ${salesAmount} SOL to ${salesPubkey.toBase58()}`);
      signature = await sendAndConfirmTransaction(connection, tx, [serverKeypair]);
      console.log(`[approvePayout] Transaction successful: ${signature}`);
    } catch (txErr: unknown) {
      console.error("[approvePayout] on-chain tx failed:", txErr);
      return NextResponse.json(
        { error: "On-chain payout transaction failed: " + (txErr instanceof Error ? txErr.message : "Unknown error") },
        { status: 500 }
      );
    }

    // 4. Record payout and update campaign budget + meetings_used atomically
    const newMeetingsUsed = campaign.meetings_used + 1;
    const newStatus =
      newMeetingsUsed >= campaign.meeting_capacity ? "CLOSED" : "ACTIVE";

    // Build transaction operations
    const operations = [];

    // 4.1 Update meeting status to APPROVED
    operations.push(
      prisma.meeting.update({
        where: { id: meeting_id },
        data: { status: "APPROVED" },
      })
    );

    // 4.2 Create or update payout record
    if (meeting.payout) {
      operations.push(
        prisma.payout.update({
          where: { id: meeting.payout.id },
          data: { tx_signature: signature, status: "SUCCESS" },
        })
      );
    } else {
      operations.push(
        prisma.payout.create({
          data: {
            meeting_id,
            sales_id: meeting.sales_id,
            amount: salesAmount, // Record actual amount received by sales
            tx_signature: signature,
            status: "SUCCESS",
          },
        })
      );
    }

    // 4.3 Create referral reward record if applicable
    if (salesUser.referrer && referrerBonus > 0) {
      operations.push(
        prisma.referralReward.create({
          data: {
            referrer_id: salesUser.referrer.id,
            referred_id: salesUser.id,
            meeting_id,
            amount: referrerBonus,
            tx_signature: signature,
          }
        })
      );
    }

    // 4.4 Update campaign budget_used, meetings_used, and status
    operations.push(
      prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          budget_used: { increment: amount }, // Budget used is the full reward
          meetings_used: { increment: 1 },
          status: newStatus,
        },
      })
    );

    const txResults = await prisma.$transaction(operations as any);

    // txResults[1] is always the payout operation based on how we built the array
    const payout = txResults[1];

    return NextResponse.json(
      { payout, signature, tx_signature: signature },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/payout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
