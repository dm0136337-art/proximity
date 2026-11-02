import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ProjectStatus =
  | "In Development"
  | "Pre-Production"
  | "In Production"
  | "Post-Production"
  | "Completed";

export type InquiryStatus = "new" | "read" | "responded";

export type ProjectRecord = {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  genre: string;
  director: string;
  poster_url: string | null;
  promotional_images: string[] | null;
  cast: string[] | null;
  production_crew: string[] | null;
  production_start_date: string | null;
  expected_release_date: string | null;
  production_status: ProjectStatus;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  poster_display_url?: string | null;
  promotional_images_display?: string[];
};

export type InquiryRecord = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const storageAssetPrefix = "storage://production-assets/";
const signedUrlLifetimeSeconds = 60 * 60;

export function getPublicSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getAdminSupabaseClient() {
  if (!serviceRoleKey || !supabaseUrl) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function coerceProject(record: Partial<ProjectRecord>): ProjectRecord {
  return {
    id: record.id ?? "",
    title: record.title ?? "Untitled",
    slug: record.slug ?? "untitled",
    synopsis: record.synopsis ?? "",
    genre: record.genre ?? "Drama",
    director: record.director ?? "",
    poster_url: record.poster_url ?? null,
    promotional_images: record.promotional_images ?? [],
    cast: record.cast ?? [],
    production_crew: record.production_crew ?? [],
    production_start_date: record.production_start_date ?? null,
    expected_release_date: record.expected_release_date ?? null,
    production_status: record.production_status ?? "In Development",
    is_published: Boolean(record.is_published),
    created_at: record.created_at ?? "",
    updated_at: record.updated_at ?? "",
  };
}

export function coerceInquiry(record: Partial<InquiryRecord>): InquiryRecord {
  return {
    id: record.id ?? "",
    first_name: record.first_name ?? "",
    last_name: record.last_name ?? "",
    phone_number: record.phone_number ?? "",
    email: record.email ?? "",
    message: record.message ?? "",
    status: record.status ?? "new",
    created_at: record.created_at ?? "",
  };
}

function getPrivateStoragePath(asset: string) {
  if (asset.startsWith(storageAssetPrefix)) {
    return asset.slice(storageAssetPrefix.length);
  }

  if (!supabaseUrl) {
    return null;
  }

  try {
    const url = new URL(asset);
    if (url.origin !== new URL(supabaseUrl).origin) {
      return null;
    }

    const match = url.pathname.match(
      /^\/storage\/v1\/object\/(?:public|sign)\/production-assets\/(.+)$/,
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

async function createDisplayUrl(client: SupabaseClient, asset: string | null) {
  if (!asset) {
    return asset;
  }

  const path = getPrivateStoragePath(asset);
  if (!path) {
    return asset;
  }

  if (path.startsWith("/") || path.split("/").some((part) => part === "." || part === "..")) {
    console.error("A project contains an invalid storage asset reference.");
    return null;
  }

  const { data, error } = await client.storage
    .from("production-assets")
    .createSignedUrl(path, signedUrlLifetimeSeconds);

  if (error) {
    console.error("Could not create a signed project asset URL.", { name: error.name });
    return null;
  }

  return data.signedUrl;
}

export async function withProjectDisplayAssets(
  client: SupabaseClient,
  project: ProjectRecord,
): Promise<ProjectRecord> {
  const [posterDisplayUrl, promotionalImagesDisplay] = await Promise.all([
    createDisplayUrl(client, project.poster_url),
    Promise.all((project.promotional_images ?? []).map((image) => createDisplayUrl(client, image))),
  ]);

  return {
    ...project,
    poster_display_url: posterDisplayUrl,
    promotional_images_display: promotionalImagesDisplay.filter(
      (image): image is string => image !== null,
    ),
  };
}

export async function getPublishedProjects() {
  const client = getPublicSupabaseClient();
  if (!client) {
    console.error("Public Supabase configuration is missing.");
    return [];
  }

  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load published projects.", { code: error.code });
    return [];
  }

  const projects = (data ?? []).map((entry) => coerceProject(entry));
  const adminClient = getAdminSupabaseClient();

  if (
    !adminClient &&
    projects.some((project) =>
      [project.poster_url, ...(project.promotional_images ?? [])].some(
        (asset) => asset !== null && getPrivateStoragePath(asset) !== null,
      ),
    )
  ) {
    console.error("Supabase service-role configuration is required to display private project assets.");
  }

  return adminClient
    ? Promise.all(projects.map((project) => withProjectDisplayAssets(adminClient, project)))
    : projects;
}

export async function getProjectBySlug(slug: string) {
  const client = getPublicSupabaseClient();
  if (!client) {
    console.error("Public Supabase configuration is missing.");
    return null;
  }

  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("Could not load the requested published project.", { code: error.code });
    return null;
  }

  if (!data) {
    return null;
  }

  const project = coerceProject(data);
  const adminClient = getAdminSupabaseClient();

  if (!adminClient && project.poster_url && getPrivateStoragePath(project.poster_url) !== null) {
    console.error("Supabase service-role configuration is required to display private project assets.");
    return project;
  }

  return adminClient ? withProjectDisplayAssets(adminClient, project) : project;
}

export async function getAdminDashboardData() {
  const client = getAdminSupabaseClient();

  if (!client) {
    throw new Error("Supabase service-role configuration is missing.");
  }

  const [projectsResult, inquiriesResult] = await Promise.all([
    client.from("projects").select("*").order("created_at", { ascending: false }),
    client.from("inquiries").select("*").order("created_at", { ascending: false }),
  ]);

  if (projectsResult.error) {
    console.error("Could not load administrator projects.", { code: projectsResult.error.code });
    throw new Error("Could not load administrator dashboard data.");
  }

  if (inquiriesResult.error) {
    console.error("Could not load administrator inquiries.", { code: inquiriesResult.error.code });
    throw new Error("Could not load administrator dashboard data.");
  }

  const projects = await Promise.all(
    (projectsResult.data ?? [])
      .map((entry) => coerceProject(entry))
      .map((project) => withProjectDisplayAssets(client, project)),
  );
  const inquiries = (inquiriesResult.data ?? []).map((entry) => coerceInquiry(entry));

  return { projects, inquiries };
}
