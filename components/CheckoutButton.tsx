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

      // ✅ Supabase session (browser)
      const { data, error: sessionErr } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (sessionErr || !accessToken) {
        setError("Bitte zuerst einloggen, um zur Kasse zu gehen.");
        return;
      }

      // ✅ call the real route: /api/checkout
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        // server valida preços via Shopify, então manda só id + quantity
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
          })),
        }),
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
