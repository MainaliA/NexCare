// POST /api/doctor/appointments — MISSING: Create appointment with LLM summary

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser }            from "@/lib/auth";
import { prisma }                    from "@/lib/db";
import { generateSummary }           from "@/lib/llm";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "doctor")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    patientId: string;
    date: string;
    diagnosisText: string;
    prescriptionText: string;
    dailyActions: string;
    medicines: Array<{ name: string; dosage: string; frequency: string; times: string[] }>;
  };

  // Get patient name for the summary
  const patient = await prisma.user.findFirst({ where: { id: body.patientId, role: "patient" } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  // Generate AI summary
  let llmSummary: string | null = null;
  try {
    llmSummary = await generateSummary(
      body.diagnosisText,
      body.prescriptionText,
      body.dailyActions,
    );
  } catch (err) {
    console.error("Summary generation failed:", err);
  }

  // Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      patientId:        body.patientId,
      doctorId:         user.id,
      date:             new Date(body.date),
      status:           "completed",
      diagnosisText:    body.diagnosisText,
      prescriptionText: body.prescriptionText,
      dailyActions:     body.dailyActions,
      llmSummary,
      medicines: {
        create: body.medicines.map((m) => ({
          name:      m.name,
          dosage:    m.dosage,
          frequency: m.frequency,
          times:     JSON.stringify(m.times),
        })),
      },
    },
    include: { medicines: true },
  });

  return NextResponse.json({ appointment, llmSummary }, { status: 201 });
}
