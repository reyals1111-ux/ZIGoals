import { NextRequest, NextResponse } from "next/server";
import { securityPolicy } from "./lib/security-policy";
// Legacy edge middleware is intentional: OpenNext cannot run Node proxy yet.
export function middleware(request: NextRequest) {
  const https = request.nextUrl.protocol === "https:";
  const {nonce, csp} = securityPolicy(process.env.NODE_ENV === "development", https);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-zigoals-origin", request.nextUrl.origin);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({request:{headers}});
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (https) response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|social-card.svg|social-card.png).*)"] };
