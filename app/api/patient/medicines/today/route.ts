// GET /api/patient/medicines/today — Person B

import { NextResponse }   from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "patient")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get latest appointment medicines
  const appointment = await prisma.appointment.findFirst({
    where:   { patientId: user.id, status: "completed" },
    orderBy: { date: "desc" },
    include: { medicines: true },
  });

  if (!appointment) return NextResponse.json([]);

  // Check which were taken today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const takenActions = await prisma.patientAction.findMany({
    where: { patientId: user.id, actionType: "medicine_taken", timestamp: { gte: todayStart } },
  });

  const takenNames = new Set(
    takenActions.map((a) => {
      try { return JSON.parse(a.details ?? "{}").medicineName as string; }
      catch { return ""; }
    })
  );

  const result = appointment.medicines.map((m) => ({
    id:        m.id,
    name:      m.name,
    dosage:    m.dosage,
    frequency: m.frequency,
    times:     (() => { try { return JSON.parse(m.times) as string[]; } catch { return []; } })(),
    taken:     takenNames.has(m.name),
  }));

  return NextResponse.json(result);
}
