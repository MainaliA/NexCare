// GET /api/doctor/patients/:id/daily-report — MISSING: AI daily report

import { NextResponse }     from "next/server";
import { getCurrentUser }   from "@/lib/auth";
import { prisma }           from "@/lib/db";
import { generateDailyReport } from "@/lib/llm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: patientId } = await params;

  const patient = await prisma.user.findFirst({ where: { id: patientId, role: "patient" } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const latestAppt = await prisma.appointment.findFirst({
    where: { patientId, status: "completed" },
    orderBy: { date: "desc" },
    include: { medicines: true },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayActions = await prisma.patientAction.findMany({
    where: { patientId, timestamp: { gte: todayStart } },
  });

  const medicineTaken = todayActions.filter((a) => a.actionType === "medicine_taken");
  const chatSessions  = todayActions.filter((a) => a.actionType === "chatbot_used");

  const takenNames = new Set(
    medicineTaken.map((a) => {
      try { return JSON.parse(a.details ?? "{}").medicineName as string; } catch { return ""; }
    })
  );

  const allMeds = latestAppt?.medicines ?? [];
  const missedMedicines = allMeds.filter((m) => !takenNames.has(m.name)).map((m) => `${m.name} ${m.dosage}`);

  const todaySymptoms = await prisma.symptom.findMany({
    where: { patientId, reportedAt: { gte: todayStart } },
  });

  // Weekly adherence
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyTaken = await prisma.patientAction.count({
    where: { patientId, actionType: "medicine_taken", timestamp: { gte: weekAgo } },
  });
  const expectedWeekly = allMeds.length * 7;
  const weeklyAdherence = expectedWeekly > 0 ? Math.round((weeklyTaken / expectedWeekly) * 100) : 100;

  const report = await generateDailyReport(
    patient.name,
    latestAppt?.diagnosisText ?? "No diagnosis",
    medicineTaken.length,
    allMeds.length,
    missedMedicines,
    chatSessions.length,
    todaySymptoms.map((s) => s.description),
    weeklyAdherence,
  );

  return NextResponse.json({
    report,
    raw: {
      medicineTaken: medicineTaken.length,
      medicineTotal: allMeds.length,
      missedMedicines,
      chatbotSessions: chatSessions.length,
      newSymptoms: todaySymptoms.length,
      weeklyAdherence,
    },
  });
}
