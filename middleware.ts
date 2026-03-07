// middleware.ts — Person A owns this

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyRequestToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await verifyRequestToken(request);

  // Protect patient routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/chat")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    if (user.role !== "patient") return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
  }

  // Protect doctor routes
  if (pathname.startsWith("/doctor")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    if (user.role !== "doctor") return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const dest = user.role === "doctor" ? "/doctor/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*", "/doctor/:path*", "/login", "/signup"],
};
