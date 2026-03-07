// POST /api/patient/symptoms — Person B

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser }            from "@/lib/auth";
import { prisma }                    from "@/lib/db";
import { triageSymptom }             from "@/lib/llm";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "patient")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { description, severity, appointmentId } = body as {
    description:   string;
    severity:      string;
    appointmentId: string;
  };

  if (!description?.trim())
    return NextResponse.json({ error: "Description is required" }, { status: 400 });

  // Fetch appointment context for triage
  const appointment = await prisma.appointment.findFirst({
    where:   { id: appointmentId, patientId: user.id },
    include: { doctor: { select: { id: true, name: true } } },
  });

  const diagnosis    = appointment?.diagnosisText    ?? "Unknown";
  const prescription = appointment?.prescriptionText ?? "None";

  // Run AI triage
  const triage = await triageSymptom(description, severity, diagnosis, prescription);

  // Save symptom
  await prisma.symptom.create({
    data: {
      patientId:       user.id,
      appointmentId:   appointmentId ?? undefined,
      description,
      severity,
      triageResult:    triage.assessment,
      triageReasoning: triage.reasoning,
    },
  });

  // Log action
  await prisma.patientAction.create({
    data: {
      patientId:  user.id,
      actionType: "symptom_reported",
      details:    JSON.stringify({ description, severity, triageResult: triage.assessment }),
    },
  });

  // Create doctor alert if needed
  if (triage.doctorAlert && appointment?.doctor) {
    await prisma.alert.create({
      data: {
        patientId: user.id,
        doctorId:  appointment.doctor.id,
        type:      triage.assessment === "escalate" ? "escalation" : "new_symptom",
        message:   `${user.name} reported: "${description}" — Triage: ${triage.assessment.toUpperCase()} (${triage.confidence}% confidence). ${triage.reasoning}`,
        status:    "unread",
      },
    });
  }

  return NextResponse.json(triage);
}
