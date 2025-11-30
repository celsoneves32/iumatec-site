"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const from = searchParams.get("from") || "/dashboard";

  // Se já está logado → manda direto para /dashboard (ou “from”)
  if (user) {
    router.replace(from);
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    // ⚠️ LOGIN FAKE – só para testes, ainda sem backend
    login({
      name: name || email.split("@")[0],
      email,
    });

    router.replace(from);
  };

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Anmelden</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Demo-Login nur für das IUMATEC-Projekt (noch kein echtes Kundenkonto).
      </p>

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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Einloggen
        </button>
      </form>
    </main>
  );
}
