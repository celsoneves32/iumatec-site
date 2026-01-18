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

      // 1) Buscar sessão do Supabase no browser
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError("Session-Fehler. Bitte neu einloggen.");
        return;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setError("Du bist nicht eingeloggt. Bitte zuerst einloggen.");
        return;
      }

      // 2) Chamar API com Bearer token
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          items: items.map((it) => ({
            id: it.id,
            quantity: it.quantity,
          })),
        }),
      });

      const dataRes = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof dataRes?.error === "string"
            ? dataRes.error
            : "Die Zahlung konnte nicht gestartet werden. Bitte versuch es später noch einmal."
        );
        return;
      }

      if (!dataRes?.url) {
        setError(
          "Unerwarteter Fehler: Keine Weiterleitungs-URL erhalten. Bitte versuch es später noch einmal."
        );
        return;
      }

      window.location.href = dataRes.url;
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
