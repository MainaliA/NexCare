// POST /api/auth/signup — Person A owns this; this is a working stub

import { NextRequest, NextResponse } from "next/server";
import bcrypt                        from "bcryptjs";
import { prisma }                    from "@/lib/db";
import { signToken, setAuthCookie }  from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role } = await req.json() as {
      email: string; password: string; name: string; role: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: role === "doctor" ? "doctor" : "patient" },
    });

    const token = await signToken({
      id: user.id, email: user.email, name: user.name,
      role: user.role as "patient" | "doctor",
    });
    await setAuthCookie(token);

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
