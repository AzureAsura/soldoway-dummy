import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const MOCK_APY = 0.05; // 5% APY as per spec

function calculateMockYield(depositAmountSol: number, depositTimestamp: Date): number {
  const msSinceDeposit = Date.now() - depositTimestamp.getTime();
  const daysSinceDeposit = msSinceDeposit / (1000 * 60 * 60 * 24);
  return depositAmountSol * MOCK_APY * (daysSinceDeposit / 365);
}

// POST /api/withdraw — Business triggers withdrawEscrow() on-chain.
// Transfers remaining SOL + mock yield from server wallet to Business.
// Marks campaign as WITHDRAWN.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaign_id, business_id } = body as {
      campaign_id: string;
      business_id: string;
    };

    if (!campaign_id || !business_id) {
      return NextResponse.json(
        { error: "Missing campaign_id or business_id" },
        { status: 400 }
      );
    }

    // 1. Fetch campaign and verify ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaign_id },
      include: { business: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (campaign.business_id !== business_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (campaign.status === "WITHDRAWN") {
      return NextResponse.json(
        { error: "Campaign funds already withdrawn" },
        { status: 400 }
      );
    }

    // 2. Calculate remaining budget + mock yield
    const remaining = campaign.budget_total - campaign.budget_used;
    const yieldAmount = calculateMockYield(remaining, campaign.deposit_timestamp);
    const totalClaimable = remaining + yieldAmount;

    if (totalClaimable <= 0) {
      return NextResponse.json(
        { error: "No remaining funds to withdraw" },
        { status: 400 }
      );
    }

    // 3. Execute on-chain withdrawEscrow() via Business wallet (server-signed)
    const serverWalletKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!serverWalletKey) {
      return NextResponse.json(
        { error: "Server wallet not configured" },
        { status: 500 }
      );
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

    let businessPubkey: typeof PublicKey;
    try {
      businessPubkey = new PublicKey(campaign.business.wallet_address);
    } catch {
      return NextResponse.json(
        { error: "Invalid business wallet address" },
        { status: 400 }
      );
    }

    const lamports = Math.floor(totalClaimable * 1e9);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: serverKeypair.publicKey,
        toPubkey: businessPubkey,
        lamports,
      })
    );

    let signature = "";
    try {
      signature = await sendAndConfirmTransaction(connection, tx, [serverKeypair]);
    } catch (txErr: unknown) {
      console.error("[withdrawEscrow] on-chain tx failed:", txErr);
      return NextResponse.json(
        { error: "On-chain withdrawal failed" },
        { status: 500 }
      );
    }

    // 4. Record withdrawal + mark campaign WITHDRAWN atomically
    const [withdrawal] = await prisma.$transaction([
      prisma.withdrawal.create({
        data: {
          campaign_id,
          business_id,
          amount: totalClaimable,
          tx_signature: signature,
        },
      }),
      prisma.campaign.update({
        where: { id: campaign_id },
        data: { status: "WITHDRAWN" },
      }),
    ]);

    return NextResponse.json(
      {
        withdrawal,
        signature,
        tx_signature: signature,
        amount: totalClaimable,
        yield_amount: yieldAmount,
        remaining_budget: remaining,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/withdraw]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
