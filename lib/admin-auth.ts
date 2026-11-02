import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "pp_admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 8;

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || null;
}

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function hasAdminAuthConfiguration() {
  const password = getAdminPassword();
  return Boolean(password && password.length >= 12 && getAdminSessionSecret());
}

export function createAdminSessionToken(now = Date.now()) {
  const password = getAdminPassword();
  const secret = getAdminSessionSecret();

  if (!password || password.length < 12 || !secret) {
    throw new Error("Administrator authentication is not configured.");
  }

  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_DURATION_SECONDS;
  const signature = createHmac("sha256", secret)
    .update(`v1:${expiresAt}:${password}`)
    .digest("hex");

  return `${expiresAt}.${signature}`;
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const password = getAdminPassword();
  const secret = getAdminSessionSecret();

  if (!token || !password || password.length < 12 || !secret) {
    return false;
  }

  const [expiresAtValue, actualSignature, extra] = token.split(".");
  if (
    extra !== undefined ||
    !/^\d+$/.test(expiresAtValue) ||
    !/^[a-f0-9]{64}$/.test(actualSignature)
  ) {
    return false;
  }

  const expiresAt = Number(expiresAtValue);
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + ADMIN_SESSION_DURATION_SECONDS
  ) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`v1:${expiresAt}:${password}`)
    .digest("hex");
  const actual = Buffer.from(actualSignature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function requireAdminLogin() {
  return isAdminAuthenticated();
}
