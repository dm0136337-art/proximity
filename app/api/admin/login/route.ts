import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_SECONDS,
  createAdminSessionToken,
  getAdminPassword,
  hasAdminAuthConfiguration,
} from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const loginSchema = z.strictObject({
  password: z.string().min(1).max(1024),
});

export async function POST(request: Request) {
  if (!hasAdminAuthConfiguration()) {
    console.error("Administrator password or session secret is missing or invalid.");
    return NextResponse.json({ error: "Administrator login is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The login request must contain valid JSON." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  let allowed: boolean;
  try {
    allowed = await checkRateLimit(request, "admin-login", 5, 15 * 60);
  } catch {
    return NextResponse.json({ error: "Administrator login is temporarily unavailable." }, { status: 503 });
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(15 * 60) } },
    );
  }

  const expectedPassword = getAdminPassword();
  if (!expectedPassword) {
    return NextResponse.json({ error: "Administrator login is not configured." }, { status: 503 });
  }

  const providedBuffer = Buffer.from(parsed.data.password, "utf8");
  const expectedBuffer = Buffer.from(expectedPassword, "utf8");
  const matches =
    providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);

  if (!matches) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
  });

  return response;
}
