import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Anonymous sessions — v1 has no accounts. A random token in a signed
// httpOnly cookie (90 days) is the sole notion of identity; Book rows carry
// it and repositories enforce ownership against it.
//
// AUTH SEAM: when real accounts land, this module is the only place that
// changes — resolve the session to a userId here (e.g. after OAuth) and keep
// the same getSessionToken() contract for the repositories.
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "pixela_session";
const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set (>= 16 chars)");
  }
  return secret;
}

function signature(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

// Pure helpers (exported for tests): cookie value is "<token>.<hmac-hex>".
export function signSessionValue(token: string, secret: string): string {
  return `${token}.${signature(token, secret)}`;
}

export function verifySessionValue(
  value: string,
  secret: string,
): string | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const token = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1), "utf8");
  const expected = Buffer.from(signature(token, secret), "utf8");
  // Compare BYTE lengths — timingSafeEqual throws on unequal buffers, and a
  // forged multibyte signature must read as tampered, not as a 500.
  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? token : null;
}

// Read the verified session token, or null if absent/tampered. Safe anywhere
// server-side (RSC, actions, route handlers).
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return verifySessionValue(value, sessionSecret());
}

// Adopt an existing session (resume-link redemption: the user's other
// device). Replaces this browser's session cookie wholesale — with real
// accounts this is where "log in via link" would slot in.
export async function adoptSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionValue(token, sessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

// Get the session token, minting and setting the cookie if absent. Cookies
// can only be written in Server Actions and Route Handlers — call it there.
export async function ensureSessionToken(): Promise<string> {
  const existing = await getSessionToken();
  if (existing) return existing;
  const token = randomUUID();
  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionValue(token, sessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return token;
}
