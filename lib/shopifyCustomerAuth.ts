import "server-only";
import {
  createHash, randomBytes, createCipheriv, createDecipheriv,
  createPublicKey, verify as verifySignature, timingSafeEqual,
} from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

type ShopifyDiscovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
};
type Tokens = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
};
type AuthTransaction = { state: string; nonce: string; verifier: string; issued: number };
type Session = { accessToken: string; idToken: string; refreshToken?: string; expiresAt: number };
export const cookieNames = {
  transaction: "__Host-iumatec_auth_tx",
  session: "__Host-iumatec_customer_session",
  identity: "__Host-iumatec_customer_id_token",
  refresh: "__Host-iumatec_customer_refresh",
};
const sessionMaxAge = 60 * 60 * 24 * 7;

export function storeDomain() {
  const raw = (process.env.SHOPIFY_CUSTOMER_ACCOUNT_DOMAIN || "shop.iumatec.ch").trim();
  if (!/^[a-z0-9.-]+$/i.test(raw) || !raw.includes(".")) throw new Error("Invalid customer shop domain");
  return raw;
}
export function clientId() {
  const id = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Missing Shopify Customer Account client ID");
  return id;
}
export function appOrigin() {
  const origin = (process.env.SHOPIFY_CUSTOMER_ACCOUNT_BASE_URL || "https://iumatec.ch").replace(/\/$/, "");
  const u = new URL(origin);
  if (u.protocol !== "https:" || u.pathname !== "/") throw new Error("Use an HTTPS application origin");
  return u.origin;
}
export const callbackUrl = () => `${appOrigin()}/api/auth/shopify/callback`;
export const logoutRedirectUrl = () => `${appOrigin()}/konto`;
export const randomB64 = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const pkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

function secretKey(): Buffer {
  const secret = process.env.IUMATEC_CUSTOMER_COOKIE_SECRET;
  if (!secret || secret.length < 48) throw new Error("Customer session secret is missing/too short");
  return createHash("sha256").update(secret, "utf8").digest();
}
export function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), bytes.toString("base64url")].join(".");
}
export function unseal<T>(token: string | undefined): T | null {
  if (!token) return null;
  try {
    const [i, t, d] = token.split(".");
    if (!i || !t || !d) return null;
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(i, "base64url"));
    decipher.setAuthTag(Buffer.from(t, "base64url"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(d, "base64url")), decipher.final()]).toString("utf8")) as T;
  } catch { return null; }
}
export function constantEquals(a: string, b: string): boolean {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function setEncryptedCookie(res: NextResponse, name: string, value: unknown, maxAge: number) {
  const sealed = seal(value);
  // Cookies larger than the 4 KB browser limit must never be silently truncated.
  if (sealed.length > 3600) throw new Error("Customer cookie too large");
  res.cookies.set(name, sealed, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });
}
export function clearCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}
export function getTransaction(req: NextRequest): AuthTransaction | null {
  return unseal<AuthTransaction>(req.cookies.get(cookieNames.transaction)?.value);
}
export function getSession(req: NextRequest): Session | null {
  const access = unseal<{ accessToken: string; expiresAt: number }>(req.cookies.get(cookieNames.session)?.value);
  const identity = unseal<{ idToken: string }>(req.cookies.get(cookieNames.identity)?.value);
  const refresh = unseal<{ refreshToken?: string }>(req.cookies.get(cookieNames.refresh)?.value);
  if (!access || !identity || !access.accessToken || !identity.idToken || typeof access.expiresAt !== "number") return null;
  return { ...access, ...identity, ...refresh };
}
export function saveSession(res: NextResponse, session: Session) {
  setEncryptedCookie(res, cookieNames.session, { accessToken: session.accessToken, expiresAt: session.expiresAt }, sessionMaxAge);
  setEncryptedCookie(res, cookieNames.identity, { idToken: session.idToken }, sessionMaxAge);
  if (session.refreshToken) setEncryptedCookie(res, cookieNames.refresh, { refreshToken: session.refreshToken }, sessionMaxAge);
}
export function clearSession(res: NextResponse) {
  clearCookie(res, cookieNames.session); clearCookie(res, cookieNames.identity); clearCookie(res, cookieNames.refresh);
}

function assertHttpsUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Unsafe URL returned by Shopify discovery");
  return raw;
}
export async function discoverShopify(): Promise<ShopifyDiscovery> {
  const response = await fetch(`https://${storeDomain()}/.well-known/openid-configuration`, { cache: "no-store" });
  if (!response.ok) throw new Error("Shopify login discovery unavailable");
  const cfg = await response.json() as ShopifyDiscovery;
  for (const key of ["authorization_endpoint", "token_endpoint", "end_session_endpoint", "jwks_uri"] as const) {
    if (typeof cfg[key] !== "string") throw new Error("Incomplete Shopify discovery");
    assertHttpsUrl(cfg[key]);
  }
  if (!cfg.issuer || !cfg.issuer.startsWith("https://")) throw new Error("Missing OIDC issuer");
  return cfg;
}
function parseJwt(token: string): { header: { alg: string; kid: string }; payload: Record<string, unknown>; signature: Buffer; signingInput: Buffer } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Bad ID token");
  return {
    header: JSON.parse(Buffer.from(parts[0], "base64url").toString()),
    payload: JSON.parse(Buffer.from(parts[1], "base64url").toString()),
    signature: Buffer.from(parts[2], "base64url"),
    signingInput: Buffer.from(`${parts[0]}.${parts[1]}`),
  };
}
export async function verifyIdToken(token: string, cfg: ShopifyDiscovery, expectedNonce?: string) {
  const jwt = parseJwt(token);
  const jwksResponse = await fetch(cfg.jwks_uri, { cache: "no-store" });
  if (!jwksResponse.ok) throw new Error("Cannot obtain Shopify signing keys");
  const jwks = await jwksResponse.json() as { keys: Array<Record<string, unknown>> };
  const key = jwks.keys?.find(k => k.kid === jwt.header.kid && (k.use === undefined || k.use === "sig"));
  if (!key) throw new Error("Unknown Shopify signing key");
  const publicKey = createPublicKey({ key: key as any, format: "jwk" });
  const verified = jwt.header.alg === "RS256"
    ? verifySignature("RSA-SHA256", jwt.signingInput, publicKey, jwt.signature)
    : jwt.header.alg === "ES256"
      ? verifySignature("sha256", jwt.signingInput, { key: publicKey, dsaEncoding: "ieee-p1363" }, jwt.signature)
      : false;
  if (!verified) throw new Error("Invalid Shopify ID token signature");
  const claims = jwt.payload;
  const now = Math.floor(Date.now() / 1000);
  const aud = claims.aud;
  if (claims.iss !== cfg.issuer || !(typeof aud === "string" ? aud === clientId() : Array.isArray(aud) && aud.includes(clientId()))) throw new Error("ID token issuer or audience mismatch");
  if (typeof claims.exp !== "number" || claims.exp < now - 60) throw new Error("Expired ID token");
  if (typeof claims.iat === "number" && claims.iat > now + 60) throw new Error("Invalid ID token issue time");
  if (expectedNonce && claims.nonce !== expectedNonce) throw new Error("Invalid login nonce");
  return claims;
}
export async function exchangeCode(code: string, verifier: string): Promise<{ tokens: Tokens; cfg: ShopifyDiscovery }> {
  const cfg = await discoverShopify();
  const response = await fetch(cfg.token_endpoint, {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId(), code, redirect_uri: callbackUrl(), code_verifier: verifier }),
  });
  if (!response.ok) throw new Error("Shopify token exchange failed");
  const tokens = await response.json() as Tokens;
  if (!tokens.access_token || !tokens.id_token || !Number.isFinite(tokens.expires_in)) throw new Error("Incomplete Shopify token response");
  return { tokens, cfg };
}
export async function refreshedSession(session: Session): Promise<Session | null> {
  if (session.expiresAt > Date.now() + 60_000) return session;
  if (!session.refreshToken) return null;
  try {
    const cfg = await discoverShopify();
    const res = await fetch(cfg.token_endpoint, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId(), refresh_token: session.refreshToken }) });
    if (!res.ok) return null;
    const tokens = await res.json() as Tokens;
    if (!tokens.access_token || !Number.isFinite(tokens.expires_in)) return null;
    const newIdToken = tokens.id_token || session.idToken;
    if (tokens.id_token) await verifyIdToken(tokens.id_token, cfg);
    return { accessToken: tokens.access_token, idToken: newIdToken, refreshToken: tokens.refresh_token || session.refreshToken, expiresAt: Date.now() + tokens.expires_in * 1000 };
  } catch { return null; }
}
export async function customerDetails(accessToken: string): Promise<{ displayName?: string; email?: string } | null> {
  try {
    const discovery = await fetch(`https://${storeDomain()}/.well-known/customer-account-api`, { cache: "no-store" });
    if (!discovery.ok) return null;
    const { graphql_api } = await discovery.json() as { graphql_api: string };
    assertHttpsUrl(graphql_api);
    const response = await fetch(graphql_api, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", Authorization: accessToken }, body: JSON.stringify({ query: "query CustomerSummary { customer { displayName emailAddress { emailAddress } } }" }) });
    if (!response.ok) return null;
    const json = await response.json();
    const customer = json?.data?.customer;
    return customer ? { displayName: customer.displayName || undefined, email: customer.emailAddress?.emailAddress || undefined } : null;
  } catch { return null; }
}
