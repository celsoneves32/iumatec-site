"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Bitte gib deine E-Mail-Adresse und dein Passwort ein.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: from,
      });

      if (!result) {
        setError(
          "Login fehlgeschlagen. Bitte versuch es später noch einmal."
        );
        return;
      }

      if (result.error) {
        // Einheitliche Fehlermeldung aus Datenschutzgründen
        setError("E-Mail-Adresse oder Passwort ist nicht korrekt.");
        return;
      }

      // Erfolgreich → weiterleiten
      router.push(result.url || from || "/");
    } catch (err) {
      console.error(err);
      setError(
        "Unerwarteter Fehler beim Login. Bitte versuch es später noch einmal."
      );
    } finally {
      setLoading(false);
    }
  }

  // Optional: Fehler von NextAuth (z.B. ?error=CredentialsSignin) abfangen
  const externalError =
    urlError === "CredentialsSignin"
      ? "E-Mail-Adresse oder Passwort ist nicht korrekt."
      : null;

  return (
    <main className="min-h-[70vh] bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          {/* Titel */}
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            Anmelden
          </h1>
          <p className="text-sm text-neutral-600 mb-6">
            Melde dich mit deinem IUMATEC Konto an, um schneller zu bestellen
            und deine Bestellungen sowie Kundendaten jederzeit im Blick zu
            behalten.
          </p>

          {/* Fehlermeldung */}
          {(error || externalError) && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error || externalError}
            </div>
          )}

          {/* Formular */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete="email"
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                required
              />
              <p className="mt-1 text-xs text-neutral-500">
                Achtung auf Gross-/Kleinschreibung.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Wird eingeloggt…" : "Jetzt einloggen"}
            </button>
          </form>

          {/* Link zur Registrierung */}
          <p className="mt-6 text-center text-sm text-neutral-600">
            Noch kein IUMATEC Konto?{" "}
            <Link
              href={`/register?from=${encodeURIComponent(from)}`}
              className="font-semibold text-red-600 hover:text-red-700"
            >
              Jetzt Konto erstellen
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
