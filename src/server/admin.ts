import { headers } from "next/headers";

// Admin gate: HTTP basic auth against ADMIN_USER / ADMIN_PASSWORD env vars.
// src/proxy.ts challenges and blocks /admin/* at the edge; these helpers give
// route handlers and server actions defense in depth (actions POST through
// the proxy matcher too, but never trust a single layer).

// Constant-time string comparison without node:crypto so the same logic can
// run in the edge runtime (src/proxy.ts inlines this shape).
export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bytesA = encoder.encode(a);
  const bytesB = encoder.encode(b);
  let mismatch = bytesA.length === bytesB.length ? 0 : 1;
  const length = Math.max(bytesA.length, bytesB.length);
  for (let i = 0; i < length; i += 1) {
    mismatch |= (bytesA[i % bytesA.length] ?? 0) ^ (bytesB[i % bytesB.length] ?? 0);
  }
  return mismatch === 0;
}

export function checkBasicAuth(authorization: string | null): boolean {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) return false;
  if (!authorization?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(authorization.slice(6));
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  const expected = `${user}:${password}`;
  return constantTimeEqual(decoded, expected);
}

// For server actions / RSC under /admin — throws when the request lacks
// valid credentials (the proxy should have blocked it already).
export async function requireAdmin(): Promise<void> {
  const headerStore = await headers();
  if (!checkBasicAuth(headerStore.get("authorization"))) {
    throw new Error("Admin authentication required");
  }
}
