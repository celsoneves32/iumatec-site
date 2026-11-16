import { NextRequest, NextResponse } from "next/server";
import { clearCookie, clearSession, cookieNames, discoverShopify, getSession, logoutRedirectUrl } from "@/lib/shopifyCustomerAuth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = getSession(req);
  let logoutUrl = logoutRedirectUrl();
  if (session?.idToken) {
    try {
      const cfg = await discoverShopify();
      const url = new URL(cfg.end_session_endpoint);
      url.searchParams.set("id_token_hint", session.idToken);
      url.searchParams.set("post_logout_redirect_uri", logoutRedirectUrl());
      logoutUrl = url.toString();
    } catch { /* local session is still cleared */ }
  }
  const res = NextResponse.json({ logoutUrl }, { headers: { "Cache-Control": "no-store" } });
  clearSession(res);
  clearCookie(res, cookieNames.transaction);
  return res;
}
