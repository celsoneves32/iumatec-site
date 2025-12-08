// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_TO = process.env.CONTACT_TO_EMAIL || "support@iumatec.ch";
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

    // -------- 1) E-Mail zu dir (Support) --------
    const internalSubject = `Neue Kontaktanfrage von ${name}`;
    const internalText = `
Neue Kontaktanfrage über das Formular auf iumatec.ch

Name: ${name}
E-Mail: ${email}

Nachricht:
${message}
`.trim();

    const { error: internalError } = await resend.emails.send({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: email,
      subject: internalSubject,
      text: internalText,
    });

    if (internalError) {
      console.error("Fehler beim Senden an Support:", internalError);
      return NextResponse.json(
        { ok: false, error: "Nachricht konnte nicht gesendet werden." },
        { status: 500 }
      );
    }

    // -------- 2) Bestätigung an den Kunden --------
    const customerSubject = "Vielen Dank für deine Anfrage bei IUMATEC";
    const customerText = `
Hallo ${name},

vielen Dank für deine Nachricht an IUMATEC.

Wir haben deine Anfrage erhalten und melden uns in der Regel innerhalb von 24 Stunden bei dir zurück.

Deine Nachricht:
----------------
${message}
----------------

Freundliche Grüsse
IUMATEC Schweiz
`.trim();

    await resend.emails.send({
      from: CONTACT_FROM,
      to: email,
      subject: customerSubject,
      text: customerText,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Kontakt-API Fehler:", err);
    return NextResponse.json(
      { ok: false, error: "Unerwarteter Fehler beim Senden." },
      { status: 500 }
    );
  }
}
