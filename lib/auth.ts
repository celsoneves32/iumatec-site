// lib/auth.ts
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "changeme");

/**
 * Extrai o token do cookie "iumatec_token".
 */
export function getTokenFromCookieHeader(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)iumatec_token=([^;]+)/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Valida o JWT e devolve o userId (ou null).
 */
export async function verifyIumatecToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as any).userId as string;
  } catch (e) {
    console.error("JWT verify error", e);
    return null;
  }
}

/**
 * Helper principal para Request (Route Handlers / APIs):
 * devolve o userId a partir do cookie "iumatec_token".
 */
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const token = getTokenFromCookieHeader(cookieHeader);
  if (!token) return null;

  return verifyIumatecToken(token);
}

/**
 * Variante para quando você já tem o cookieHeader (ex.: headers() em Server Component).
 */
export async function getUserIdFromCookieHeader(cookieHeader: string): Promise<string | null> {
  const token = getTokenFromCookieHeader(cookieHeader);
  if (!token) return null;

  return verifyIumatecToken(token);
}
