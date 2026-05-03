import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notFound } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

// GET /api/tasks/[id] — get task detail with meetings and payout status
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, wallet_address: true, email: true } },
        meetings: {
          include: {
            sales: { select: { id: true, wallet_address: true, email: true } },
            payout: true,
          },
          orderBy: { created_at: "desc" },
        },
        withdrawals: true,
      },
    });

    if (!task) return notFound("Task");

    return NextResponse.json(task);
  } catch (err) {
    console.error("[GET /api/tasks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
