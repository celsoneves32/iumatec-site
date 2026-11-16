import { NextRequest, NextResponse } from "next/server";
import { appOrigin, cookieNames, constantEquals, clearCookie, exchangeCode, getTransaction, saveSession, verifyIdToken } from "@/lib/shopifyCustomerAuth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const transaction = getTransaction(req);
  const state = req.nextUrl.searchParams.get("state") || "";
  const code = req.nextUrl.searchParams.get("code") || "";
  const response = (pathname: string) => {
    const res = NextResponse.redirect(new URL(pathname, appOrigin()));
    clearCookie(res, cookieNames.transaction);
    res.headers.set("Cache-Control", "no-store");
    return res;
  };
  if (!transaction || Date.now() - transaction.issued > 600_000 || !state || !constantEquals(transaction.state, state) || !code || req.nextUrl.searchParams.has("error")) {
    return response("/konto?auth=invalid");
  }
  try {
    const { tokens, cfg } = await exchangeCode(code, transaction.verifier);
    await verifyIdToken(tokens.id_token, cfg, transaction.nonce);
    const res = response("/konto?auth=ok");
    saveSession(res, { accessToken: tokens.access_token, idToken: tokens.id_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000 });
    return res;
  } catch { return response("/konto?auth=failed"); }
}
