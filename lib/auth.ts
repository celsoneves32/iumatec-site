// lib/auth.ts
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "changeme");

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/iumatec_token=([^;]+)/);
  if (!match) return null;

  try {
    const token = match[1];
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as any).userId as string;
  } catch (e) {
    console.error("JWT verify error", e);
    return null;
  }
}
