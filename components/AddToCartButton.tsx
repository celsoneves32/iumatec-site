"use client";

import { useState } from "react";

export default function AddToCartButton({
  variantId,
  quantity = 1,
}: {
  variantId: string;
  quantity?: number;
}) {
  const [loading, setLoading] = useState(false);

  async function buyNow() {
    try {
      setLoading(true);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Checkout failed");
      }

      // ✅ redirect correto para Shopify Checkout
      window.location.href = data.url;
    } catch (err: any) {
      alert(err.message || "Erro ao abrir checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={buyNow}
      disabled={loading}
      className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
    >
      {loading ? "A abrir checkout…" : "Kaufen"}
    </button>
  );
}
