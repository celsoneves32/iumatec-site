import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Validação simples
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email inválido." },
        { status: 400 }
      );
    }

    // Verificar variáveis de ambiente
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY missing");
      return NextResponse.json(
        { error: "Server configuration error (API key missing)." },
        { status: 500 }
      );
    }

    if (!process.env.NEWSLETTER_NOTIFY_TO) {
      console.error("❌ NEWSLETTER_NOTIFY_TO missing");
      return NextResponse.json(
        { error: "Server configuration error (destination email missing)." },
        { status: 500 }
      );
    }

    // Inicializar Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Enviar email
    await resend.emails.send({
      from: "IUMATEC <noreply@resend.dev>", // depois podemos mudar para domínio verificado
      to: process.env.NEWSLETTER_NOTIFY_TO,
      subject: "Neue Newsletter-Anmeldung",
      text: `Neuer Abonnent: ${email}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Senden." },
      { status: 500 }
    );
  }
}
