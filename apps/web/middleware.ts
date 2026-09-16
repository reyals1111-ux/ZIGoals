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
  return response;
}
export const config = {
  // Public files and reserved Next asset endpoints only. Missing favicon.ico
  // is HTML (404), so it deliberately retains the nonce policy.
  matcher: ["/((?!_next/static(?:/|$)|_next/image$|(?:icon\\.svg|robots\\.txt|social-card\\.svg|social-card\\.png)$).*)"],
};
