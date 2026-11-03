import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerAuthClient } from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";

const loginSchema = z.strictObject({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
});

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };

  const client = await createSupabaseServerAuthClient();
  if (!client) {
    console.error("Supabase authentication configuration is missing.");
    return NextResponse.json(
      { error: "Sign in is temporarily unavailable." },
      { status: 503, headers },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please enter a valid email and password." }, { status: 400, headers });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email and password." }, { status: 400, headers });
  }

  let allowed: boolean;
  try {
    allowed = await checkRateLimit(request, "admin-login", 5, 15 * 60);
  } catch {
    return NextResponse.json(
      { error: "Sign in is temporarily unavailable." },
      { status: 503, headers },
    );
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { ...headers, "Retry-After": String(15 * 60) } },
    );
  }

  const { data, error } = await client.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401, headers },
    );
  }

  if (data.user.app_metadata?.role !== "admin") {
    const { error: signOutError } = await client.auth.signOut({ scope: "local" });
    if (signOutError) {
      console.error("Could not clear a non-administrator Supabase session.", {
        name: signOutError.name,
        code: signOutError.code,
      });
    }

    return NextResponse.json(
      { error: "This account is not authorized to access the dashboard." },
      { status: 403, headers },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200, headers });
}
