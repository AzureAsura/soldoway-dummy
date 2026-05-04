import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/users/me?id=<privy_id>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("[GET /api/users/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
