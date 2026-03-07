// POST /api/patient/medicines/:id/take — Person B

import { NextResponse }   from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "patient")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify medicine belongs to this patient
  const medicine = await prisma.medicine.findFirst({
    where: { id, appointment: { patientId: user.id } },
  });

  if (!medicine)
    return NextResponse.json({ error: "Medicine not found" }, { status: 404 });

  // Prevent duplicate "taken" logs for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const alreadyTaken = await prisma.patientAction.findFirst({
    where: {
      patientId:  user.id,
      actionType: "medicine_taken",
      timestamp:  { gte: todayStart },
      details:    { contains: medicine.name },
    },
  });

  if (alreadyTaken)
    return NextResponse.json({ success: true, alreadyLogged: true });

  await prisma.patientAction.create({
    data: {
      patientId:  user.id,
      actionType: "medicine_taken",
      details:    JSON.stringify({ medicineId: id, medicineName: medicine.name, time: new Date().toTimeString().slice(0, 5) }),
    },
  });

  return NextResponse.json({ success: true });
}
