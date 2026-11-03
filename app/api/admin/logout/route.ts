import { NextResponse } from "next/server";
import { createSupabaseServerAuthClient } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const client = await createSupabaseServerAuthClient();
  if (!client) {
    console.error("Supabase authentication configuration is missing for logout.");
    return NextResponse.json(
      { error: "Sign out is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) {
    console.error("Could not end the Supabase session.", { name: error.name, code: error.code });
    return NextResponse.json(
      { error: "Sign out failed. Please try again." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return NextResponse.redirect(new URL("/admin/login", request.url), {
    status: 303,
    headers: { "Cache-Control": "private, no-store" },
  });
}
