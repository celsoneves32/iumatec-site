// app/api/register/route.ts
import { supabase } from "@/lib/supabase";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: "E-Mail und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    // Verificar se já existe utilizador com esse email
    const { data: existing } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return Response.json(
        { error: "Ein Konto mit dieser E-Mail existiert bereits." },
        { status: 400 }
      );
    }

    const hashed = await hash(password, 10);

    const { error } = await supabase.from("User").insert({
      name,
      email,
      password: hashed,
    });

    if (error) {
      console.error("Supabase insert error", error);
      return Response.json(
        { error: "Fehler beim Anlegen des Kontos." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return Response.json(
      { error: "Unerwarteter Fehler beim Registrieren." },
      { status: 500 }
    );
  }
}
