import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { badRequest } from "@/lib/api";

// POST /api/claim — validasi -> server wallet sign -> panggil claim() on-chain
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sales_id } = body;

    if (!sales_id) return badRequest("Missing sales_id");

    // Get all pending payouts for this sales rep
    const pendingPayouts = await prisma.payout.findMany({
      where: {
        sales_id,
        status: "PENDING",
      },
      include: {
        meeting: {
          include: { task: true },
        },
      },
    });

    if (pendingPayouts.length === 0) {
      return badRequest("No pending payouts to claim");
    }

    // Load Server Wallet
    const serverWalletKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!serverWalletKey) {
      return NextResponse.json({ error: "Server wallet not configured" }, { status: 500 });
    }
    
    const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require("@solana/web3.js");
    const secretKey = Uint8Array.from(JSON.parse(serverWalletKey));
    const serverKeypair = Keypair.fromSecretKey(secretKey);

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const salesPublicKey = new PublicKey(sales_id);

    // Calculate total accumulated claim amount
    const totalAmount = pendingPayouts.reduce((acc, p) => acc + p.amount, 0);

    // Simulate Claim Transfer from Server Wallet (acting as Escrow PDA)
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: serverKeypair.publicKey,
        toPubkey: salesPublicKey,
        lamports: Math.floor(totalAmount * 1e9),
      })
    );

    let signature = "";
    try {
      signature = await sendAndConfirmTransaction(connection, tx, [serverKeypair]);
    } catch (txErr) {
      console.error("Claim transaction failed:", txErr);
      return NextResponse.json({ error: "On-chain claim transaction failed." }, { status: 500 });
    }

    // Mark all pending payouts as SUCCESS (claimed)
    const updatePromises = pendingPayouts.map(p => 
      prisma.payout.update({
        where: { id: p.id },
        data: {
          status: "SUCCESS",
          tx_signature: signature,
        }
      })
    );

    await prisma.$transaction(updatePromises);

    return NextResponse.json({ success: true, signature, claimed_amount: totalAmount });
  } catch (err) {
    console.error("[POST /api/claim]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
