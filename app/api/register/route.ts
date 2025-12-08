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

    // prüfen, ob E-Mail schon existiert
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "EMAIL_EXISTS" }, // die RegisterPage zeigt dann einen schönen Text
        { status: 400 }
      );
    }

    // Passwort hashen
    const hashedPassword = await hash(password, 10);

    // neuen User anlegen
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
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        user,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("REGISTER_ERROR", err);
    return NextResponse.json(
      { error: "Fehler beim Anlegen des Kontos." },
      { status: 500 }
    );
  }
}
