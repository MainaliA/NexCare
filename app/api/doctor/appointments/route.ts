import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSummary, generatePreVisitChecklist } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { patientId: string; date: string; diagnosisText: string; prescriptionText: string; dailyActions: string; medicines: Array<{ name: string; dosage: string; frequency: string; times: string[] }> };
  const patient = await prisma.user.findFirst({ where: { id: body.patientId, role: "patient" } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  let llmSummary: string | null = null;
  try { llmSummary = await generateSummary(body.diagnosisText, body.prescriptionText, body.dailyActions); } catch (e) { console.error("Summary failed:", e); }

  let preVisitChecklist: string[] = [];
  try { preVisitChecklist = await generatePreVisitChecklist(body.diagnosisText, body.prescriptionText); } catch (e) { console.error("Checklist failed:", e); }

  const appointment = await prisma.appointment.create({
    data: {
      patientId: body.patientId, doctorId: user.id, date: new Date(body.date), status: "completed",
      diagnosisText: body.diagnosisText, prescriptionText: body.prescriptionText, dailyActions: body.dailyActions,
      llmSummary,
      preVisitChecklist: JSON.stringify(preVisitChecklist),
      medicines: { create: body.medicines.map(m => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, times: JSON.stringify(m.times) })) },
    }, include: { medicines: true },
  });
  return NextResponse.json({ appointment, llmSummary, preVisitChecklist }, { status: 201 });
}
