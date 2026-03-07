// GET /api/doctor/patients/:id — MISSING: Full patient detail

import { NextResponse }   from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const patient = await prisma.user.findFirst({
    where: { id, role: "patient" },
  });

  if (!patient)
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const appointments = await prisma.appointment.findMany({
    where:   { patientId: id, doctorId: user.id },
    include: { medicines: true },
    orderBy: { date: "desc" },
  });

  const symptoms = await prisma.symptom.findMany({
    where:   { patientId: id },
    orderBy: { reportedAt: "desc" },
  });

  const actions = await prisma.patientAction.findMany({
    where:   { patientId: id },
    orderBy: { timestamp: "desc" },
    take:    50,
  });

  const alerts = await prisma.alert.findMany({
    where:   { patientId: id, doctorId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ patient, appointments, symptoms, actions, alerts });
}
