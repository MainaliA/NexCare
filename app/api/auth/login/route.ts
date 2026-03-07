// POST /api/auth/login — Person A owns this; this is a working stub

import { NextRequest, NextResponse } from "next/server";
import bcrypt                        from "bcryptjs";
import { prisma }                    from "@/lib/db";
import { signToken, setAuthCookie }  from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = await signToken({
      id: user.id, email: user.email, name: user.name,
      role: user.role as "patient" | "doctor",
    });
    await setAuthCookie(token);

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
