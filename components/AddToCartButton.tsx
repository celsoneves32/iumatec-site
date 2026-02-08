"use client";

import { useState } from "react";

export default function AddToCartButton({
  variantId,
}: {
  variantId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function buyNow() {
    setLoading(true);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, quantity: 1 }),
    });

    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    setLoading(false);
    alert("Erro no checkout");
  }

  return (
    <button
      onClick={buyNow}
      disabled={loading}
      className="rounded-lg bg-black px-4 py-2 text-white"
    >
      {loading ? "…" : "Comprar"}
    </button>
  );
}
