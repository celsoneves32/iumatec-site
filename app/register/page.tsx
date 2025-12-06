"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Bitte gib mindestens E-Mail-Adresse und Passwort ein.");
      return;
    }

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Versuchen, eine schön formatierte Fehlermeldung zu zeigen
        if (data?.error === "EMAIL_EXISTS") {
          setError(
            "Mit dieser E-Mail-Adresse ist bereits ein Konto registriert."
          );
        } else if (typeof data?.error === "string") {
          setError(data.error);
        } else {
          setError(
            "Registrierung fehlgeschlagen. Bitte versuch es später noch einmal."
          );
        }
        return;
      }

      // Erfolgreich → zurück zur gewünschten Seite oder Dashboard
      router.push(from || "/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        "Unerwarteter Fehler bei der Registrierung. Bitte versuch es später noch einmal."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          {/* Titel */}
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            Konto erstellen
          </h1>
          <p className="text-sm text-neutral-600 mb-6">
            Erstelle jetzt dein IUMATEC Konto, damit du schneller bestellen
            kannst und deine Bestellungen sowie Kundendaten jederzeit im Blick
            hast.
          </p>

          {/* Fehlermeldung */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Formular */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-neutral-800 mb-1"
              >
                Name <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Max Muster"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-800 mb-1"
              >
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kunde@example.ch"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-800 mb-1"
              >
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                required
              />
              <p className="mt-1 text-xs text-neutral-500">
                Mindestens 6 Zeichen. Verwende nach Möglichkeit auch Zahlen
                und Sonderzeichen.
              </p>
            </div>

            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-sm font-medium text-neutral-800 mb-1"
              >
                Passwort wiederholen
              </label>
              <input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Konto wird erstellt…" : "Jetzt registrieren"}
            </button>
          </form>

          {/* Link zum Login */}
          <p className="mt-6 text-center text-sm text-neutral-600">
            Schon ein IUMATEC Konto?{" "}
            <Link
              href={`/login?from=${encodeURIComponent(from)}`}
              className="font-semibold text-red-600 hover:text-red-700"
            >
              Jetzt einloggen
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
