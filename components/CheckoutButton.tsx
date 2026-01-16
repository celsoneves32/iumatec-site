// components/CheckoutButton.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CheckoutItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
};

type CheckoutButtonProps = {
  items: CheckoutItem[];
};

export default function CheckoutButton({ items }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);

    if (!items || items.length === 0) {
      setError("Dein Warenkorb ist leer.");
      return;
    }

    try {
      setLoading(true);

      // ✅ Pega access_token do Supabase (no browser)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setError("Bitte melde dich erneut an (Session ungültig).");
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`, // ✅ aqui
        },
        body: JSON.stringify({ items }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Die Zahlung konnte nicht gestartet werden. Bitte versuch es später noch einmal."
        );
        return;
      }

      if (!data?.url) {
        setError(
          "Unerwarteter Fehler: Keine Weiterleitungs-URL erhalten. Bitte versuch es später noch einmal."
        );
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setError(
        "Unerwarteter Fehler beim Start der Zahlung. Bitte versuch es später noch einmal."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Weiterleitung zur Zahlung…" : "Zur Kasse (Stripe)"}
      </button>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
