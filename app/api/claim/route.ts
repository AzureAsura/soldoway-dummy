import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// POST /api/claim — Sales triggers claim() on-chain
// Collects all APPROVED meetings that haven't been paid yet (PENDING payouts)
// and transfers accumulated SOL from server wallet to Sales wallet.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sales_id } = body as { sales_id: string };

    if (!sales_id) {
      return NextResponse.json({ error: "Missing sales_id" }, { status: 400 });
    }

    // Get Sales user's wallet address
    const salesUser = await prisma.user.findUnique({ where: { id: sales_id } });
    if (!salesUser) {
      return NextResponse.json({ error: "Sales user not found" }, { status: 404 });
    }

    // Find all pending payouts for this sales rep
    const pendingPayouts = await prisma.payout.findMany({
      where: { sales_id, status: "PENDING" },
      include: { meeting: { include: { campaign: true } } },
    });

    if (pendingPayouts.length === 0) {
      return NextResponse.json(
        { error: "No pending rewards to claim" },
        { status: 400 }
      );
    }

    const totalAmount = pendingPayouts.reduce((acc, p) => acc + p.amount, 0);

    // Execute on-chain claim() via server wallet
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

    const lamports = Math.floor(totalAmount * 1e9);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: serverKeypair.publicKey,
        toPubkey: salesPubkey,
        lamports,
      })
    );

    let signature = "";
    try {
      signature = await sendAndConfirmTransaction(connection, tx, [serverKeypair]);
    } catch (txErr: unknown) {
      console.error("[claim] on-chain tx failed:", txErr);
      return NextResponse.json(
        { error: "On-chain claim transaction failed" },
        { status: 500 }
      );
    }

    // Mark all pending payouts as SUCCESS with the tx signature
    await prisma.$transaction(
      pendingPayouts.map((p) =>
        prisma.payout.update({
          where: { id: p.id },
          data: { status: "SUCCESS", tx_signature: signature },
        })
      )
    );

    return NextResponse.json({
      success: true,
      signature,
      tx_signature: signature,
      claimed_amount: totalAmount,
      payout_count: pendingPayouts.length,
    });
  } catch (err) {
    console.error("[POST /api/claim]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
