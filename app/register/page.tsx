// app/register/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");

  const from = searchParams.get("from") || "/dashboard";

  // Se já tem login, manda para dashboard
  if (user) {
    router.replace(from);
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !password2) {
      setError("Bitte alle Felder ausfüllen.");
      return;
    }

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (password !== password2) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    // ⚠️ Demo-Register: aqui só gravamos em memória/localStorage via AuthContext
    login({
      name: name.trim(),
      email: email.trim(),
    });

    router.replace(from);
  };

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Registrieren</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Erstelle ein IUMATEC-Konto, um schneller zu bestellen und deine
        Daten im Blick zu behalten. (Demo-Version, noch ohne echtes
        Kundenkonto-System.)
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Max Muster"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">E-Mail</label>
          <input
            type="email"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kunde@example.ch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Passwort</label>
          <input
            type="password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Passwort wiederholen
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Konto erstellen
        </button>
      </form>

      <p className="mt-6 text-xs text-neutral-600">
        Du hast bereits ein Konto?{" "}
        <Link
          href={`/login?from=${encodeURIComponent(from)}`}
          className="font-semibold text-red-600 hover:underline"
        >
          Jetzt anmelden
        </Link>
        .
      </p>
    </main>
  );
}
