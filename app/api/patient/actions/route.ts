// POST /api/patient/actions — Person B (generic action logger)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser }            from "@/lib/auth";
import { prisma }                    from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "patient")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { actionType, details } = await req.json() as {
    actionType: string;
    details?:   Record<string, unknown>;
  };

  if (!actionType)
    return NextResponse.json({ error: "actionType is required" }, { status: 400 });

  const action = await prisma.patientAction.create({
    data: {
      patientId:  user.id,
      actionType,
      details:    details ? JSON.stringify(details) : null,
    },
  });

  return NextResponse.json({ success: true, id: action.id });
}
