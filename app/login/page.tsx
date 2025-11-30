// app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const from = searchParams.get("from") || "/dashboard";

  if (session?.user) {
    router.replace(from);
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError(res.error);
      return;
    }

    router.replace(from);
  };

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Anmelden</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Melde dich mit deinem IUMATEC-Konto an.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Einloggen
        </button>
      </form>

      <p className="mt-6 text-xs text-neutral-600">
        Noch kein Konto?{" "}
        <Link
          href={`/register?from=${encodeURIComponent(from)}`}
          className="font-semibold text-red-600 hover:underline"
        >
          Jetzt registrieren
        </Link>
        .
      </p>
    </main>
  );
}
