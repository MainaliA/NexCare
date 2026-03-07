// POST /api/chat — Chatbot with auto symptom detection + triage + doctor alerts
// GET  /api/chat?appointmentId=xxx — Load chat history

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser }            from "@/lib/auth";
import { prisma }                    from "@/lib/db";
import { chatWithContext, triageSymptom } from "@/lib/llm";
import type { TriageResult }         from "@/lib/llm";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "patient")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointmentId, message, history = [] } = await req.json() as {
    appointmentId: string;
    message: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!appointmentId || !message)
    return NextResponse.json({ error: "appointmentId and message are required" }, { status: 400 });

  // ── Fetch appointment context ──
  const appointment = await prisma.appointment.findFirst({
    where:   { id: appointmentId, patientId: user.id },
    include: { doctor: { select: { id: true, name: true } } },
  });

  if (!appointment)
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const doctorName = appointment.doctor?.name ?? "your doctor";
  const doctorId   = appointment.doctor?.id;

  // ── Call the chatbot (now returns { reply, symptomDetected }) ──
  const { reply, symptomDetected } = await chatWithContext(
    message,
    history,
    appointment.diagnosisText    ?? "No diagnosis",
    appointment.prescriptionText ?? "No prescription",
    appointment.dailyActions     ?? "No daily plan",
    user.name,
    doctorName,
  );

  // ── Save conversation messages ──
  await prisma.chatMessage.createMany({
    data: [
      { appointmentId, role: "user",      content: message },
      { appointmentId, role: "assistant", content: reply },
    ],
  });

  // ── Log chatbot usage ──
  await prisma.patientAction.create({
    data: {
      patientId:  user.id,
      actionType: "chatbot_used",
      details:    JSON.stringify({
        appointmentId,
        questionPreview: message.substring(0, 100),
        symptomDetected: symptomDetected ?? null,
      }),
    },
  });

  // ── Handle detected symptom: triage → save → alert doctor ──
  let triageResult: TriageResult | null = null;

  if (symptomDetected && doctorId) {
    // 1. Run AI triage on the detected symptom
    triageResult = await triageSymptom(
      symptomDetected,
      "medium",
      appointment.diagnosisText    ?? "",
      appointment.prescriptionText ?? "",
    );

    // 2. Determine severity from triage urgency
    const severity =
      triageResult.urgency === "urgent" ? "high" :
      triageResult.urgency === "soon"   ? "medium" :
      "low";

    // 3. Save Symptom record
    await prisma.symptom.create({
      data: {
        patientId:        user.id,
        appointmentId,
        description:      symptomDetected,
        severity,
        triageResult:     triageResult.assessment,
        triageReasoning:  triageResult.reasoning,
        triageConfidence: triageResult.confidence,
      },
    });

    // 4. Log symptom_reported action
    await prisma.patientAction.create({
      data: {
        patientId:  user.id,
        actionType: "symptom_reported",
        details:    JSON.stringify({
          source: "chatbot_auto_detected",
          description: symptomDetected,
          triage: triageResult.assessment,
          confidence: triageResult.confidence,
        }),
      },
    });

    // 5. Create doctor Alert if triage says so
    if (triageResult.doctorAlert) {
      await prisma.alert.create({
        data: {
          patientId: user.id,
          doctorId,
          type:    triageResult.assessment === "escalate" ? "escalation" : "new_symptom",
          message: `${user.name} mentioned during chat: "${symptomDetected}" — Triage: ${triageResult.assessment.toUpperCase()} (${triageResult.confidence}%). ${triageResult.reasoning}`,
          status:  "unread",
        },
      });
    }
  }

  // ── Response ──
  return NextResponse.json({
    reply,
    symptomDetected: symptomDetected
      ? { description: symptomDetected, triage: triageResult }
      : null,
  });
}

// ── GET: Load chat history ──
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointmentId = req.nextUrl.searchParams.get("appointmentId");
  if (!appointmentId)
    return NextResponse.json({ error: "appointmentId required" }, { status: 400 });

  const messages = await prisma.chatMessage.findMany({
    where:   { appointmentId },
    orderBy: { timestamp: "asc" },
  });

  return NextResponse.json({ messages });
}
