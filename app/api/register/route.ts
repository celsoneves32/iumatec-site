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

    // Verifica se já existe
    const { data: existing } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .single();

    if (existing) {
      return Response.json(
        { error: "Benutzer existiert bereits." },
        { status: 400 }
      );
    }

    const hashed = await hash(password, 10);

    const { error } = await supabase.from("User").insert({
      name,
      email,
      password: hashed,
    });

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
