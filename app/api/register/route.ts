// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = (body.name ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim().toLowerCase();
    const password = (body.password ?? "").toString();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Bitte gib E-Mail-Adresse und Passwort ein." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Das Passwort muss mindestens 6 Zeichen lang sein." },
        { status: 400 }
      );
    }

    // E-Mail schon vergeben?
    // => findFirst funktioniert auch dann, wenn email nicht @unique ist
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "EMAIL_EXISTS" }, // deine RegisterPage kennt diese Meldung
        { status: 400 }
      );
    }

    // Passwort hashen
    const hashedPassword = await hash(password, 10);

    // User anlegen
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        // falls du kein createdAt Feld hast, APAGA ESTA LINHA
        // createdAt: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        user,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("REGISTER_ERROR", err);

    // Versuch, eine etwas genauere Fehlermeldung zurückzugeben
    const message =
      typeof err?.message === "string"
        ? err.message
        : "Fehler beim Anlegen des Kontos.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
