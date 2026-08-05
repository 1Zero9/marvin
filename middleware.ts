import { NextRequest, NextResponse } from "next/server";
import { isAllowedMutationOrigin } from "@/lib/requestSecurity";

export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!isAllowedMutationOrigin(
    request.method,
    request.url,
    request.headers.get("origin"),
    request.headers.get("sec-fetch-site"),
  )) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403, headers: { "Cache-Control": "private, no-store", "X-Request-ID": requestId } },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Request-ID", requestId);
  const isPublicSharedPhoto = request.method === "GET"
    && request.nextUrl.pathname.startsWith("/api/media/photo/")
    && request.nextUrl.searchParams.has("share");
  if (!isPublicSharedPhoto) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
