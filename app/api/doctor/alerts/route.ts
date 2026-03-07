// GET /api/doctor/alerts — MISSING: Doctor's alert feed

import { NextResponse }   from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await prisma.alert.findMany({
    where:   { doctorId: user.id },
    include: { patient: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take:    50,
  });

  return NextResponse.json(alerts);
}
