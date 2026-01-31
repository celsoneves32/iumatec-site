import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function isValidEmail(email: unknown) {
  return typeof email === "string" && email.includes("@") && email.length <= 320;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const notifyTo = process.env.NEWSLETTER_NOTIFY_TO!;
    const resendKey = process.env.RESEND_API_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase env vars ausentes no servidor." },
        { status: 500 }
      );
    }

    // 1) Guardar no DB (upsert evita duplicados)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error: dbErr } = await supabaseAdmin
      .from("newsletter_subscribers")
      .upsert({ email }, { onConflict: "email" });

    if (dbErr) {
      console.error("Newsletter DB error:", dbErr);
      return NextResponse.json(
        { error: "Erro ao gravar no DB." },
        { status: 500 }
      );
    }

    // 2) Enviar email de notificação (opcional, mas recomendado)
    if (resendKey && notifyTo) {
      const resend = new Resend(resendKey);

      await resend.emails.send({
        from: "IUMATEC <noreply@iumatec.ch>",
        to: notifyTo,
        subject: "Neue Newsletter-Anmeldung",
        text: `Neuer Abonnent: ${email}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter Error:", error);
    return NextResponse.json({ error: "Fehler beim Senden." }, { status: 500 });
  }
}
