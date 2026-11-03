import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export async function createSupabaseServerAuthClient() {
  const config = getSupabaseAuthConfig();
  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function getSupabaseAuthUser() {
  const client = await createSupabaseServerAuthClient();
  if (!client) {
    return { configured: false as const, user: null };
  }

  const { data, error } = await client.auth.getUser();
  if (error) {
    if (error.name !== "AuthSessionMissingError") {
      console.error("Could not verify the Supabase session.", {
        name: error.name,
        code: error.code,
      });
    }

    return { configured: true as const, user: null };
  }

  return { configured: true as const, user: data.user };
}

export async function isAdminAuthenticated() {
  const { user } = await getSupabaseAuthUser();
  return user?.app_metadata?.role === "admin";
}

export async function requireAdminLogin() {
  return isAdminAuthenticated();
}
