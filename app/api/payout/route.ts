import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { computePayoutSplit } from "@/lib/fees";

// POST /api/payout
// Business triggers approvePayout() on-chain after approving a meeting.
// Platform fee (5% by default) is deducted from every reward:
//   - If the rep was referred: referrer gets 20% of the fee (≈1%), platform keeps 80% (≈4%)
//   - If the rep has no referrer: platform keeps the full 5%
// Validations per spec:
//  1. Meeting status must be PENDING
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

    // 3. Compute fee split — platform takes PLATFORM_FEE_RATE on every payout
    const { salesAmount, referrerCut, platformCut } = computePayoutSplit(
      amount,
      !!salesUser.referrer
    );

    // 4. Execute on-chain transfers via server wallet
    const serverWalletKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!serverWalletKey) {
      return NextResponse.json({ error: "Server wallet not configured" }, { status: 500 });
    }

    const secretKey = Uint8Array.from(JSON.parse(serverWalletKey));
    const serverKeypair = Keypair.fromSecretKey(secretKey);
    const rpcUrl =
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    let salesPubkey: PublicKey;
    try {
      salesPubkey = new PublicKey(salesUser.wallet_address);
    } catch {
      return NextResponse.json(
        { error: "Invalid sales wallet address" },
        { status: 400 }
      );
    }

    // Solana minimum rent-exempt balance for a system account (~0.00089 SOL)
    const RENT_EXEMPT_MIN = 890880; // lamports

    const tx = new Transaction();

    // Platform cut — send on-chain only if destination won't fall below rent-exempt minimum
    const platformWallet = process.env.PLATFORM_WALLET_ADDRESS;
    if (platformWallet && platformCut > 0) {
      const platformPubkey = new PublicKey(platformWallet);
      const platformBalance = await connection.getBalance(platformPubkey);
      const platformCutLamports = Math.floor(platformCut * 1e9);
      if (platformBalance + platformCutLamports >= RENT_EXEMPT_MIN) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: serverKeypair.publicKey,
            toPubkey: platformPubkey,
            lamports: platformCutLamports,
          })
        );
      } else {
        console.log(
          `[approvePayout] Skipping on-chain platform transfer: ` +
          `${platformCut} SOL would leave platform wallet below rent-exempt minimum. ` +
          `Recorded in PlatformRevenue DB only.`
        );
      }
    }

    // Referrer cut — same rent-exempt check
    if (salesUser.referrer && referrerCut > 0) {
      const referrerPubkey = new PublicKey(salesUser.referrer.wallet_address);
      const referrerBalance = await connection.getBalance(referrerPubkey);
      const referrerCutLamports = Math.floor(referrerCut * 1e9);
      if (referrerBalance + referrerCutLamports >= RENT_EXEMPT_MIN) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: serverKeypair.publicKey,
            toPubkey: referrerPubkey,
            lamports: referrerCutLamports,
          })
        );
      }
    }

    // Sales rep receives their net reward — bump to rent-exempt minimum if needed
    const salesBalance = await connection.getBalance(salesPubkey);
    const salesLamports = Math.floor(salesAmount * 1e9);
    const finalSalesLamports = salesBalance + salesLamports < RENT_EXEMPT_MIN
      ? RENT_EXEMPT_MIN - salesBalance  // top up to minimum so tx doesn't fail
      : salesLamports;
    tx.add(
      SystemProgram.transfer({
        fromPubkey: serverKeypair.publicKey,
        toPubkey: salesPubkey,
        lamports: finalSalesLamports,
      })
    );

    let signature = "";
    try {
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = serverKeypair.publicKey;

      console.log(
        `[approvePayout] Sending ${salesAmount} SOL to ${salesPubkey.toBase58()} ` +
        `(platform: ${platformCut} SOL, referrer: ${referrerCut} SOL)`
      );
      signature = await sendAndConfirmTransaction(connection, tx, [serverKeypair]);
      console.log(`[approvePayout] Transaction successful: ${signature}`);
    } catch (txErr: unknown) {
      console.error("[approvePayout] on-chain tx failed:", txErr);
      return NextResponse.json(
        { error: "On-chain payout transaction failed: " + (txErr instanceof Error ? txErr.message : "Unknown error") },
        { status: 500 }
      );
    }

    // 5. Record payout and update campaign budget + meetings_used atomically
    const newMeetingsUsed = campaign.meetings_used + 1;
    const newStatus =
      newMeetingsUsed >= campaign.meeting_capacity ? "CLOSED" : "ACTIVE";

    const operations: Prisma.PrismaPromise<unknown>[] = [];

    // 5.1 Update meeting status to APPROVED
    operations.push(
      prisma.meeting.update({
        where: { id: meeting_id },
        data: { status: "APPROVED" },
      })
    );

    // 5.2 Create or update payout record (amount = net received by rep)
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
            amount: salesAmount, // Net amount received by the sales rep
            tx_signature: signature,
            status: "SUCCESS",
          },
        })
      );
    }

    // 5.3 Record referral reward if applicable
    if (salesUser.referrer && referrerCut > 0) {
      operations.push(
        prisma.referralReward.create({
          data: {
            referrer_id: salesUser.referrer.id,
            referred_id: salesUser.id,
            meeting_id,
            amount: referrerCut,
            tx_signature: signature,
          }
        })
      );
    }

    // 5.4 Record platform revenue
    if (platformCut > 0) {
      operations.push(
        prisma.platformRevenue.create({
          data: {
            meeting_id,
            amount: platformCut,
            tx_signature: signature,
          }
        })
      );
    }

    // 5.5 Update campaign budget_used, meetings_used, and status
    // budget_used tracks full reward (not net) so budget math stays correct
    operations.push(
      prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          budget_used: { increment: amount },
          meetings_used: { increment: 1 },
          status: newStatus,
        },
      })
    );

    const txResults = await prisma.$transaction(operations);

    // txResults[1] is always the payout operation (index stable as long as
    // meeting.update is index 0 and payout create/update is index 1)
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
