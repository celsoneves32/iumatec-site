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

      // O route devolve redirect 303; fetch não muda a página sozinho.
      // Então pegamos a URL final do response:
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      const data = await res.json().catch(() => null);
      alert(data?.error || "Checkout failed");
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
      {loading ? "…" : "Kaufen"}
    </button>
  );
}
