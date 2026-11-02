import "server-only";

import { createHmac } from "node:crypto";
import { getAdminSupabaseClient } from "@/lib/supabase";

export type RateLimitScope = "contact" | "admin-login";

export async function checkRateLimit(
  request: Request,
  scope: RateLimitScope,
  maxRequests: number,
  windowSeconds: number,
) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Rate limiting is not configured.");
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const address = request.headers.get("x-real-ip") ?? forwardedFor?.split(",")[0]?.trim();
  if (!address || address.length > 128) {
    throw new Error("A trusted client address is unavailable.");
  }

  const keyHash = createHmac("sha256", secret)
    .update(`${scope}:${address}`)
    .digest("hex");
  const client = getAdminSupabaseClient();
  if (!client) {
    throw new Error("The rate-limit database is not configured.");
  }

  const { data, error } = await client.rpc("consume_rate_limit", {
    p_scope: scope,
    p_key_hash: keyHash,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Could not check the request rate limit.", { code: error.code });
    throw new Error("The rate-limit service is unavailable.");
  }

  if (typeof data !== "boolean") {
    throw new Error("The rate-limit service returned an invalid response.");
  }

  return data;
}
