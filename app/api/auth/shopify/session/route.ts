import { NextRequest, NextResponse } from "next/server";
import { clearSession, customerDetails, getSession, refreshedSession, saveSession } from "@/lib/shopifyCustomerAuth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const noCache = { "Cache-Control": "private, no-store, max-age=0" };
  const previous = getSession(req);
  if (!previous) return NextResponse.json({ authenticated: false }, { headers: noCache });
  const session = await refreshedSession(previous);
  if (!session) {
    const res = NextResponse.json({ authenticated: false }, { headers: noCache });
    clearSession(res);
    return res;
  }
  const customer = await customerDetails(session.accessToken);
  const res = NextResponse.json({ authenticated: true, displayName: customer?.displayName || null }, { headers: noCache });
  if (session !== previous) saveSession(res, session);
  return res;
}
