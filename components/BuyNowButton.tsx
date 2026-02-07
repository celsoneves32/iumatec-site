"use client";

import { useState } from "react";

export default function BuyNowButton({
  variantId,
  quantity = 1,
}: {
  variantId: string;
  quantity?: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handleBuy() {
    try {
      setLoading(true);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Checkout error");

      window.location.href = json.url; // redirect para Shopify checkout
    } catch (e: any) {
      alert(e.message || "Erro no checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className="w-full rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
    >
      {loading ? "A abrir checkout..." : "Comprar agora"}
    </button>
  );
}
