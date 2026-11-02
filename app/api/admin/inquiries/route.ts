import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminSupabaseClient } from "@/lib/supabase";

const inquiryStateSchema = z.strictObject({
  id: z.uuid(),
  status: z.enum(["new", "read", "responded"]),
});

const idSchema = z.strictObject({ id: z.uuid() });

async function readJson(request: Request) {
  try {
    return { body: await request.json(), valid: true as const };
  } catch {
    return { body: null, valid: false as const };
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    console.error("Supabase service-role configuration is missing for inquiry management.");
    return NextResponse.json({ error: "Inquiry management is not configured." }, { status: 503 });
  }

  const { data, error } = await client.from("inquiries").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Could not load administrator inquiries.", { code: error.code });
    return NextResponse.json({ error: "Could not load inquiries." }, { status: 500 });
  }

  return NextResponse.json({ inquiries: data ?? [] }, { status: 200 });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, valid } = await readJson(request);
  if (!valid) {
    return NextResponse.json({ error: "The inquiry request must contain valid JSON." }, { status: 400 });
  }

  const parsed = inquiryStateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid inquiry update request." }, { status: 400 });
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    console.error("Supabase service-role configuration is missing for inquiry management.");
    return NextResponse.json({ error: "Inquiry management is not configured." }, { status: 503 });
  }

  const { data, error } = await client
    .from("inquiries")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Could not update an inquiry.", { code: error.code });
    return NextResponse.json({ error: "Could not update the inquiry." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  return NextResponse.json({ inquiry: data }, { status: 200 });
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, valid } = await readJson(request);
  if (!valid) {
    return NextResponse.json({ error: "The delete request must contain valid JSON." }, { status: 400 });
  }

  const parsed = idSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid inquiry ID is required." }, { status: 400 });
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    console.error("Supabase service-role configuration is missing for inquiry management.");
    return NextResponse.json({ error: "Inquiry management is not configured." }, { status: 503 });
  }

  const { data, error } = await client
    .from("inquiries")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not delete an inquiry.", { code: error.code });
    return NextResponse.json({ error: "Could not delete the inquiry." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
