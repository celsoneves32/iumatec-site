// lib/auth.ts
import { jwtVerify } from "jose";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * NextAuth session (server-side). Use isto em layouts/pages Server Components
 * para proteger rotas como /account e /account/orders.
 */
export async function getSessionServer() {
  return getServerSession(authOptions as NextAuthOptions);
}

/**
 * Compat: extrair userId do cookie custom "iumatec_token" (JWT assinado com NEXTAUTH_SECRET).
 * Útil para APIs que ainda não migraram para getServerSession().
 */
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "changeme");

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)iumatec_token=([^;]+)/);
  if (!match) return null;

  try {
    const token = decodeURIComponent(match[1]);
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as any).userId as string;
  } catch (e) {
    console.error("JWT verify error", e);
    return null;
  }
}

/**
 * Helper: exige sessão NextAuth e devolve o user id (string) ou redireciona/lança erro
 * conforme o seu uso. (Não faz redirect aqui para não acoplar a next/navigation.)
 */
export async function getUserIdFromSession(): Promise<string | null> {
  const session = await getSessionServer();
  // Ajuste conforme o seu shape de session:
  // - session.user.id (se você já injeta no callback)
  // - ou session.user.email como fallback
  const anySession = session as any;

  return (
    anySession?.user?.id ??
    anySession?.userId ?? // se você tiver algo assim no callback
    null
  );
}
