"use client";

import { useState } from "react";

type CheckoutItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
};

export default function CheckoutButton({ items }: { items: CheckoutItem[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);

    if (!items?.length) {
      setError("Dein Warenkorb ist leer.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Checkout Fehler.");
        return;
      }

      if (json?.url) {
        window.location.href = json.url;
      } else {
        setError("Keine Checkout URL erhalten.");
      }
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60"
      >
        {loading ? "Weiterleitung…" : "Zur Kasse"}
      </button>
    </div>
  );
}
