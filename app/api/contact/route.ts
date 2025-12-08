// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// para onde queres receber
const CONTACT_TO = process.env.CONTACT_TO_EMAIL || "support@iumatec.ch";
// de quem aparece (tem de ser um domínio verificado na Resend)
const CONTACT_FROM =
  process.env.CONTACT_FROM_EMAIL || "IUMATEC Kontakt <support@iumatec.ch>";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || "").toString().trim();
    const email = (body.email || "").toString().trim();
    const message = (body.message || "").toString().trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Bitte alle Felder ausfüllen." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY fehlt");
      return NextResponse.json(
        { ok: false, error: "E-Mail Versand ist nicht konfiguriert." },
        { status: 500 }
      );
    }

    const subject = `Neue Kontaktanfrage von ${name}`;

    const text = `
Neue Kontaktanfrage über das Formular auf iumatec.ch

Name: ${name}
E-Mail: ${email}

Nachricht:
${message}
`.trim();

    const { error } = await resend.emails.send({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: email,
      subject,
      text,
    });

    if (error) {
      console.error("Fehler beim Senden mit Resend:", error);
      return NextResponse.json(
        { ok: false, error: "Nachricht konnte nicht gesendet werden." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Kontakt-API Fehler:", err);
    return NextResponse.json(
      { ok: false, error: "Unerwarteter Fehler beim Senden." },
      { status: 500 }
    );
  }
}
