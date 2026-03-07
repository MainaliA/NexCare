// POST /api/doctor/alerts/:id/acknowledge — MISSING

import { NextResponse }   from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.alert.update({
    where: { id },
    data:  { status: "read" },
  });

  return NextResponse.json({ success: true });
}
