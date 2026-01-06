// app/register/page.tsx
"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

function guessWebmailUrl(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  // shortcuts úteis
  if (domain.includes("hotmail") || domain.includes("outlook") || domain.includes("live")) {
    return "https://outlook.live.com/mail/";
  }
  if (domain.includes("gmail")) return "https://mail.google.com/";
  if (domain.includes("yahoo")) return "https://mail.yahoo.com/";
  // Hostpoint / iumatec mail (se o user estiver a usar isso)
  if (domain.includes("iumatec.ch") || domain.includes("hostpoint")) {
    return "https://office.hostpoint.ch/";
  }

  return null;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // quando sucesso, guardamos o email para mostrar a página de “verificação”
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const webmailUrl = useMemo(() => (pendingEmail ? guessWebmailUrl(pendingEmail) : null), [pendingEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      // Melhor prática: usar um redirect/callback dedicado (não /login direto)
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }, // usa "full_name" (melhor para trigger/profiles)
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        // Mensagens comuns do Supabase
        const msg = error.message?.toLowerCase();
        if (msg?.includes("already registered") || msg?.includes("already exists")) {
          setError("Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an.");
        } else {
          setError(error.message);
        }
        return;
      }

      // Se o Supabase indicar identidades vazias, costuma significar “já existe”
      if (data.user?.identities && data.user.identities.length === 0) {
        setError("Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an.");
        return;
      }

      // Sucesso: troca UI para o estado “verifica e-mail”
      setPendingEmail(email.trim());
    } catch (err: any) {
      setError(err?.message ?? "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  // UI de sucesso (melhor UX)
  if (pendingEmail) {
    return (
      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-2">Bitte bestätige deine E-Mail</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Wir haben einen Bestätigungslink an <span className="font-medium">{pendingEmail}</span> gesendet.
          Klicke auf den Link, um dein Konto zu aktivieren. Prüfe bitte auch deinen Spam-Ordner.
        </p>

        <div className="rounded-md border border-neutral-200 bg-white p-4 space-y-3">
          {webmailUrl && (
            <a
              href={webmailUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-red-700"
            >
              E-Mail öffnen
            </a>
          )}

          <Link
            href="/login"
            className="block w-full text-center rounded-md border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Zum Login
          </Link>

          <button
            type="button"
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const redirectTo = `${window.location.origin}/auth/callback`;
                const { error } = await supabase.auth.resend({
                  type: "signup",
                  email: pendingEmail,
                  options: { emailRedirectTo: redirectTo },
                });
                if (error) setError(error.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full rounded-md px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Bestätigungs-E-Mail erneut senden
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </main>
    );
  }

  // UI normal do formulário
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name (optional)</label>
          <input
            type="text"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vor- und Nachname"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">E-Mail-Adresse</label>
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
          <label className="block text-sm font-medium mb-1">Passwort wiederholen</label>
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
