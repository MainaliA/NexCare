// POST /api/auth/logout — Fixed: proper redirect without hardcoded URL

import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie }           from "@/lib/auth";

export async function POST(req: NextRequest) {
  await clearAuthCookie();
  const url = new URL("/login", req.nextUrl.origin);
  return NextResponse.redirect(url);
}
