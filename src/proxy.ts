import { NextResponse, type NextRequest } from "next/server";
import { checkBasicAuth } from "@/server/admin";

// Basic-auth gate for the whole /admin subtree (pages, actions, and the
// /admin/photos image route — browsers re-send cached credentials for paths
// under the challenged directory, which is exactly what the admin order
// previews rely on).
export function proxy(request: NextRequest): NextResponse {
  if (checkBasicAuth(request.headers.get("authorization"))) {
    return NextResponse.next();
  }
  return new NextResponse(null, {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Pixela admin"' },
  });
}

export const config = {
  matcher: "/admin/:path*",
};
