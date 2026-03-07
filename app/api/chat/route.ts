// POST /api/chat — MISSING: Created from Person D's Express chat.js, converted to Next.js API route
// GET  /api/chat?appointmentId=xxx — Load chat history

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser }            from "@/lib/auth";
import { prisma }                    from "@/lib/db";
import { chatWithContext, triageSymptom } from "@/lib/llm";

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

  // Get appointment context
  const appointment = await prisma.appointment.findFirst({
    where:   { id: appointmentId, patientId: user.id },
    include: { doctor: { select: { id: true, name: true } } },
  });

  if (!appointment)
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

  const doctorName = appointment.doctor?.name ?? "your doctor";

  // Call the chatbot
  const reply = await chatWithContext(
    message,
    history,
    appointment.diagnosisText    ?? "No diagnosis on file",
    appointment.prescriptionText ?? "No prescription on file",
    appointment.dailyActions     ?? "No daily action plan on file",
    user.name,
    doctorName,
  );

  // Save both messages to DB
  await prisma.chatMessage.createMany({
    data: [
      { appointmentId, role: "user",      content: message },
      { appointmentId, role: "assistant", content: reply },
    ],
  });

  // Log chatbot usage
  await prisma.patientAction.create({
    data: {
      patientId:  user.id,
      actionType: "chatbot_used",
      details:    JSON.stringify({ appointmentId, questionPreview: message.substring(0, 100) }),
    },
  });

  return NextResponse.json({ reply });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointmentId = req.nextUrl.searchParams.get("appointmentId");
  if (!appointmentId)
    return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });

  const messages = await prisma.chatMessage.findMany({
    where:   { appointmentId },
    orderBy: { timestamp: "asc" },
  });

  return NextResponse.json({ messages });
}
