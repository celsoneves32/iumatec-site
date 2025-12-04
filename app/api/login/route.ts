// app/api/login/route.ts
import { supabase } from "@/lib/supabase";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "changeme");

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: "E-Mail und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return Response.json(
        { error: "Kein Konto mit dieser E-Mail gefunden." },
        { status: 400 }
      );
    }

    const ok = await compare(password, user.password);
    if (!ok) {
      return Response.json(
        { error: "E-Mail oder Passwort ist falsch." },
        { status: 400 }
      );
    }

    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(SECRET);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Set-Cookie": `iumatec_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${
          7 * 24 * 60 * 60
        }`,
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    console.error(err);
    return Response.json(
      { error: "Unerwarteter Fehler beim Login." },
      { status: 500 }
    );
  }
}
