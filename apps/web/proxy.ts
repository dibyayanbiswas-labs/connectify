import { type NextRequest, NextResponse } from "next/server";

import { env } from "./env";

// Same-origin API: the browser calls /api/trpc/*, and this forwards it to the API server.
// Runs per request, so API_URL is read at runtime: one image works in every environment.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(new URL(pathname.replace(/^\/api/, "") + search, env.API_URL));
}

export const config = {
  matcher: "/api/trpc/:path*",
};
