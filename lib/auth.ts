// lib/auth.ts — JWT helpers; Person A owns this

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "nexcare-demo-secret-change-in-production-32chars"
);

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: "patient" | "doctor";
}

// Sign a JWT and store it in an httpOnly cookie
export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

// Verify token from cookie (used in server components & API routes)
export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nexcare_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// Verify token from a NextRequest (used in middleware)
export async function verifyRequestToken(
  req: NextRequest
): Promise<TokenPayload | null> {
  try {
    const token = req.cookies.get("nexcare_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// Set auth cookie (call after login/signup)
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("nexcare_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

// Clear auth cookie (call on logout)
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("nexcare_token");
}
