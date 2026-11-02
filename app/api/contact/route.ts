import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAdminSupabaseClient } from "@/lib/supabase";

const contactSchema = z.strictObject({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone_number: z
    .string()
    .trim()
    .min(7)
    .max(32)
    .regex(/^\+?[0-9()\s.-]+$/)
    .refine((value) => value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 15),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "A JSON request body is required." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return NextResponse.json({ error: "The submission is too large." }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "The submission could not be read." }, { status: 400 });
  }

  if (new TextEncoder().encode(rawBody).byteLength > 16_384) {
    return NextResponse.json({ error: "The submission is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "The submission must contain valid JSON." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please complete all required fields correctly.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ error: "The submission could not be accepted." }, { status: 400 });
  }

  let allowed: boolean;
  try {
    allowed = await checkRateLimit(request, "contact", 5, 15 * 60);
  } catch {
    return NextResponse.json({ error: "The submission service is temporarily unavailable." }, { status: 503 });
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(15 * 60) } },
    );
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    console.error("Supabase service-role configuration is missing for contact submissions.");
    return NextResponse.json({ error: "The submission service is not configured." }, { status: 503 });
  }

  const { error } = await client.from("inquiries").insert({
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    phone_number: parsed.data.phone_number,
    email: parsed.data.email,
    message: parsed.data.message,
    status: "new",
  });

  if (error) {
    console.error("Could not save a contact inquiry.", { code: error.code });
    return NextResponse.json({ error: "Could not save the inquiry. Please try again later." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
