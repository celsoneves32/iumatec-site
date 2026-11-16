import { NextRequest, NextResponse } from "next/server";
import { appOrigin, callbackUrl, clientId, cookieNames, discoverShopify, pkceChallenge, randomB64, setEncryptedCookie } from "@/lib/shopifyCustomerAuth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const cfg = await discoverShopify();
    const state = randomB64();
    const nonce = randomB64();
    const verifier = randomB64(64);
    const url = new URL(cfg.authorization_endpoint);
    url.searchParams.set("client_id", clientId());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email customer-account-api:full");
    url.searchParams.set("redirect_uri", callbackUrl());
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", pkceChallenge(verifier));
    url.searchParams.set("locale", "de-CH");
    url.searchParams.set("region_country", "CH");
    const hint = req.nextUrl.searchParams.get("email")?.trim();
    if (hint && hint.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hint)) url.searchParams.set("login_hint", hint);
    const response = NextResponse.redirect(url);
    setEncryptedCookie(response, cookieNames.transaction, { state, nonce, verifier, issued: Date.now() }, 600);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/konto?auth=configuration", appOrigin()));
  }
}
