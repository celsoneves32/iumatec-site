import { NextResponse } from "next/server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Ungültige E-Mail" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const notifyTo = process.env.NEWSLETTER_NOTIFY_TO || "support@iumatec.ch";

    if (apiKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: "IUMATEC <no-reply@iumatec.ch>",
        to: notifyTo,
        subject: "Neue Newsletter-Anmeldung",
        text: `Neue Anmeldung: ${email}`,
      });
    } else {
      console.warn("[newsletter] RESEND_API_KEY fehlt — nur registriert:", email);
    }

    // Aqui poderias também gravar em DB (Vercel KV/Supabase) se quiseres
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Serverfehler" }, { status: 500 });
  }
}
