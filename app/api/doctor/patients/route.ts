// GET /api/doctor/patients — MISSING: Doctor's patient list with alert counts

import { NextResponse }   from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all patients who have appointments with this doctor
  const appointments = await prisma.appointment.findMany({
    where:   { doctorId: user.id },
    include: {
      patient:   { select: { id: true, name: true, email: true } },
      medicines: true,
    },
    orderBy: { date: "desc" },
  });

  // Group by patient
  const patientMap = new Map<string, {
    id: string; name: string; email: string;
    latestDiagnosis: string | null; latestDate: Date;
    appointmentCount: number; status: string;
  }>();

  for (const appt of appointments) {
    if (!patientMap.has(appt.patientId)) {
      patientMap.set(appt.patientId, {
        id: appt.patient.id,
        name: appt.patient.name,
        email: appt.patient.email,
        latestDiagnosis: appt.diagnosisText,
        latestDate: appt.date,
        appointmentCount: 1,
        status: appt.status,
      });
    } else {
      patientMap.get(appt.patientId)!.appointmentCount++;
    }
  }

  // Get alert counts per patient
  const alerts = await prisma.alert.findMany({
    where: { doctorId: user.id, status: "unread" },
  });

  const alertCounts = new Map<string, number>();
  const hasEscalation = new Map<string, boolean>();
  for (const alert of alerts) {
    alertCounts.set(alert.patientId, (alertCounts.get(alert.patientId) ?? 0) + 1);
    if (alert.type === "escalation") hasEscalation.set(alert.patientId, true);
  }

  const patients = Array.from(patientMap.values()).map((p) => ({
    ...p,
    alertCount: alertCounts.get(p.id) ?? 0,
    hasEscalation: hasEscalation.get(p.id) ?? false,
  }));

  return NextResponse.json(patients);
}
