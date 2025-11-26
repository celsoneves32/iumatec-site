import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    // Se ainda não definiste, bloqueia por segurança
    return new NextResponse(
      "ADMIN_USER e ADMIN_PASSWORD não estão definidos.",
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const [user, pass] = decoded.split(":");

      if (user === adminUser && pass === adminPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Auth required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="IUMATEC Admin"',
    },
  });
}
