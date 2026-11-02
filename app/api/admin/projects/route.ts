import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminSupabaseClient, withProjectDisplayAssets } from "@/lib/supabase";

const projectStatusSchema = z.enum([
  "In Development",
  "Pre-Production",
  "In Production",
  "Post-Production",
  "Completed",
]);

const assetReferenceSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value || value.startsWith("storage://production-assets/")) {
      return true;
    }

    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  });

const projectSchema = z.strictObject({
  id: z.uuid().optional(),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  synopsis: z.string().trim().min(10).max(10000),
  genre: z.string().trim().min(1).max(100),
  director: z.string().trim().min(1).max(200),
  poster_url: assetReferenceSchema.optional().default(""),
  promotional_images: z.array(assetReferenceSchema).max(20).optional().default([]),
  cast: z.array(z.string().trim().min(1).max(200)).max(100).optional().default([]),
  production_crew: z.array(z.string().trim().min(1).max(200)).max(100).optional().default([]),
  production_start_date: z.preprocess(
    (value) => (value === "" ? null : value),
    z.iso.date().nullable().optional(),
  ),
  expected_release_date: z.preprocess(
    (value) => (value === "" ? null : value),
    z.iso.date().nullable().optional(),
  ),
  production_status: projectStatusSchema,
  is_published: z.boolean().optional().default(false),
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
    console.error("Supabase service-role configuration is missing for project management.");
    return NextResponse.json({ error: "Project management is not configured." }, { status: 503 });
  }

  const { data, error } = await client.from("projects").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Could not load administrator projects.", { code: error.code });
    return NextResponse.json({ error: "Could not load projects." }, { status: 500 });
  }

  const projects = await Promise.all(
    (data ?? []).map((project) => withProjectDisplayAssets(client, project)),
  );
  return NextResponse.json({ projects }, { status: 200 });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, valid } = await readJson(request);
  if (!valid) {
    return NextResponse.json({ error: "The project request must contain valid JSON." }, { status: 400 });
  }

  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide valid project details.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    console.error("Supabase service-role configuration is missing for project management.");
    return NextResponse.json({ error: "Project management is not configured." }, { status: 503 });
  }

  const { data, error } = await client
    .from("projects")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      synopsis: parsed.data.synopsis,
      genre: parsed.data.genre,
      director: parsed.data.director,
      poster_url: parsed.data.poster_url || null,
      promotional_images: parsed.data.promotional_images,
      cast: parsed.data.cast,
      production_crew: parsed.data.production_crew,
      production_start_date: parsed.data.production_start_date || null,
      expected_release_date: parsed.data.expected_release_date || null,
      production_status: parsed.data.production_status,
      is_published: parsed.data.is_published,
    })
    .select()
    .single();

  if (error) {
    console.error("Could not create a project.", { code: error.code });
    return NextResponse.json({ error: "Could not save the project." }, { status: 500 });
  }

  return NextResponse.json({ project: await withProjectDisplayAssets(client, data) }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, valid } = await readJson(request);
  if (!valid) {
    return NextResponse.json({ error: "The project request must contain valid JSON." }, { status: 400 });
  }

  const parsed = projectSchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      { error: "A valid project ID and project details are required." },
      { status: 400 },
    );
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    console.error("Supabase service-role configuration is missing for project management.");
    return NextResponse.json({ error: "Project management is not configured." }, { status: 503 });
  }

  const { data, error } = await client
    .from("projects")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      synopsis: parsed.data.synopsis,
      genre: parsed.data.genre,
      director: parsed.data.director,
      poster_url: parsed.data.poster_url || null,
      promotional_images: parsed.data.promotional_images,
      cast: parsed.data.cast,
      production_crew: parsed.data.production_crew,
      production_start_date: parsed.data.production_start_date || null,
      expected_release_date: parsed.data.expected_release_date || null,
      production_status: parsed.data.production_status,
      is_published: parsed.data.is_published,
    })
    .eq("id", parsed.data.id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Could not update a project.", { code: error.code });
    return NextResponse.json({ error: "Could not update the project." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project: await withProjectDisplayAssets(client, data) }, { status: 200 });
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
    return NextResponse.json({ error: "A valid project ID is required." }, { status: 400 });
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    console.error("Supabase service-role configuration is missing for project management.");
    return NextResponse.json({ error: "Project management is not configured." }, { status: 503 });
  }

  const { data, error } = await client
    .from("projects")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not delete a project.", { code: error.code });
    return NextResponse.json({ error: "Could not delete the project." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
