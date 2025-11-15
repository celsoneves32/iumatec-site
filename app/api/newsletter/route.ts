import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email inválido." },
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "IUMATEC <noreply@iumatec.ch>",
      to: process.env.NEWSLETTER_NOTIFY_TO!,
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
