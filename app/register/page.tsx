// app/register/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    if (password !== password2) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        // Se já existia utilizador com este email, Supabase devolve identities vazias
        if (data.user?.identities && data.user.identities.length === 0) {
          setError("Für diese E-Mail existiert bereits ein Konto.");
        } else {
          setSuccess(
            "Konto erstellt. Bitte bestätige deine E-Mail und melde dich dann an."
          );
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Konto erstellen</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Erstelle jetzt dein IUMATEC Konto, damit du schneller bestellen kannst
        und deine Bestellungen jederzeit im Blick hast.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Name (optional)
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vor- und Nachname"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            E-Mail-Adresse
          </label>
          <input
            type="email"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            required
            placeholder="Mindestens 6 Zeichen"
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
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Wird verarbeitet…" : "Jetzt registrieren"}
        </button>
      </form>

      <p className="mt-4 text-sm text-neutral-600">
        Schon ein IUMATEC Konto?{" "}
        <Link href="/login" className="text-red-600 hover:underline">
          Jetzt einloggen.
        </Link>
      </p>
    </main>
  );
}
