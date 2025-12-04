"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login fehlgeschlagen.");
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch (err) {
      setError("Unerwarteter Fehler beim Login.");
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Anmelden</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Melde dich mit deinem IUMATEC-Konto an, um Bestellungen und
        Kontodaten zu verwalten.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">E-Mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="kunde@example.ch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Passwort</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-red-600 text-white text-sm font-semibold py-2.5 hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Wird eingeloggt..." : "Einloggen"}
        </button>
      </form>

      <p className="mt-4 text-sm text-neutral-600">
        Noch kein Konto?{" "}
        <Link href="/register" className="text-red-600 hover:underline">
          Jetzt registrieren.
        </Link>
      </p>
    </main>
  );
}
