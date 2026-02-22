// components/AddToCartButton.tsx
"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function AddToCartButton({ variantId }: { variantId: string }) {
  const { addItem, loading } = useCart();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  async function onAdd(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    try {
      await addItem(variantId, 1);
      setState("done");
      setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1600);
    }
  }

  const label =
    loading ? "A adicionar..." : state === "done" ? "Adicionado ✅" : state === "error" ? "Erro ❌" : "In den Warenkorb";

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={loading}
      className="w-full rounded-lg bg-brand px-4 py-2 text-white text-sm font-semibold
                 hover:bg-brand-dark transition disabled:opacity-50"
    >
      {label}
    </button>
  );
}
