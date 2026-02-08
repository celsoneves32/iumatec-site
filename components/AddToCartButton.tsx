// components/AddToCartButton.tsx
"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function AddToCartButton({
  variantId,
  quantity = 1,
  mode = "add",
}: {
  variantId: string;
  quantity?: number;
  mode?: "add" | "buy";
}) {
  const [loading, setLoading] = useState(false);
  const cart = useCart();

  async function onClick() {
    try {
      setLoading(true);

      if (mode === "buy") {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId, quantity }),
        });

        if (res.redirected) {
          window.location.href = res.url;
          return;
        }

        const data = await res.json().catch(() => null);
        alert(data?.error || "Checkout failed");
        return;
      }

      await cart.add(variantId, quantity);
    } catch (e: any) {
      alert(e?.message || "Cart error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
    >
      {loading ? "…" : mode === "buy" ? "Kaufen" : "In den Warenkorb"}
    </button>
  );
}
