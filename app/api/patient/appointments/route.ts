// GET /api/patient/appointments — Person B

import { NextResponse }   from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma }         from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "patient")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointments = await prisma.appointment.findMany({
    where:   { patientId: user.id },
    orderBy: { date: "desc" },
    include: {
      medicines: true,
      doctor: { select: { id: true, name: true, email: true } },
    },
  });

  // Parse llmSummary JSON for each appointment
  const parsed = appointments.map((a) => ({
    ...a,
    llmSummary: (() => {
      try { return a.llmSummary ? JSON.parse(a.llmSummary) : null; }
      catch { return null; }
    })(),
    medicines: a.medicines.map((m) => ({
      ...m,
      times: (() => {
        try { return JSON.parse(m.times) as string[]; }
        catch { return []; }
      })(),
    })),
  }));

  return NextResponse.json(parsed);
}
