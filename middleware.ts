// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/account")) {
    const token = req.cookies.get("iumatec_token")?.value;

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname + (search || ""));
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
