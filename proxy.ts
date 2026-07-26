import { NextRequest, NextResponse } from "next/server";

// ponytail: no auth on these APIs — this only blocks cross-origin browser
// requests (CSRF from random websites against localhost). Doesn't stop DNS
// rebinding; pin allowed Hosts if that ever matters. Add real auth if hosted.
export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch {}
    if (originHost !== request.nextUrl.host) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
