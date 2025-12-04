import { supabase } from "@/lib/supabase";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const { data: user } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .single();

    if (!user) {
      return Response.json(
        { error: "Benutzer existiert nicht." },
        { status: 400 }
      );
    }

    const match = await compare(password, user.password);
    if (!match) {
      return Response.json(
        { error: "Falsches Passwort." },
        { status: 400 }
      );
    }

    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(process.env.NEXTAUTH_SECRET));

    return Response.json({ success: true, token });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
