import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/api";
import type { WithdrawRequest } from "@/types";

// POST /api/withdraw
// Business withdraws remaining SOL + yield from escrow.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WithdrawRequest & { businessId: string };
    const { task_id, businessId } = body;

    if (!task_id || !businessId) return badRequest("Missing task_id or businessId");

    // 1. Fetch task and verify ownership
    const task = await prisma.task.findUnique({ where: { id: task_id } });
    if (!task) return notFound("Task");
    if (task.business_id !== businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (task.status === "WITHDRAWN") {
      return badRequest("Task funds already withdrawn");
    }

    // 2. Calculate remaining budget
    const remaining = task.budget_total - task.budget_used;
    if (remaining <= 0) return badRequest("No remaining funds to withdraw");

    // 3. Load Server Wallet
    const serverWalletKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!serverWalletKey) {
      return NextResponse.json({ error: "Server wallet not configured" }, { status: 500 });
    }
    
    // Process the private key array from env
    const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require("@solana/web3.js");
    const secretKey = Uint8Array.from(JSON.parse(serverWalletKey));
    const serverKeypair = Keypair.fromSecretKey(secretKey);

    // 4. Construct Withdraw Transaction
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const businessPublicKey = new PublicKey(businessId);

    // Simulate withdraw transfer from server wallet back to the business
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: serverKeypair.publicKey,
        toPubkey: businessPublicKey,
        lamports: Math.floor(remaining * 1e9),
      })
    );

    let signature = "";
    try {
      signature = await sendAndConfirmTransaction(connection, tx, [serverKeypair]);
    } catch (txErr) {
      console.error("Withdrawal transaction failed:", txErr);
      return NextResponse.json({ error: "On-chain withdrawal failed." }, { status: 500 });
    }

    // 5. Record withdrawal and mark task as WITHDRAWN atomically
    const [withdrawal] = await prisma.$transaction([
      prisma.withdrawal.create({
        data: {
          task_id,
          business_id: businessId,
          amount: remaining,
          tx_signature: signature,
        },
      }),
      prisma.task.update({
        where: { id: task_id },
        data: { status: "WITHDRAWN" },
      }),
    ]);

    return NextResponse.json(withdrawal, { status: 201 });
  } catch (err) {
    console.error("[POST /api/withdraw]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
