// POST /api/auth/logout

import { NextResponse }      from "next/server";
import { clearAuthCookie }   from "@/lib/auth";
import { redirect }          from "next/navigation";

export async function POST() {
  await clearAuthCookie();
  return NextResponse.redirect(new URL("/login", "http://localhost:3000"));
}
