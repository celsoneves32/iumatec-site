"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function AddToCartButton({ variantId }: { variantId: string }) {
  const { addItem, loading } = useCart();
  const [done, setDone] = useState(false);

  async function onAdd() {
    await addItem(variantId, 1);
    setDone(true);
    setTimeout(() => setDone(false), 1200);
  }

  return (
    <button
      onClick={onAdd}
      disabled={loading}
      className="w-full rounded-lg bg-black px-4 py-2 text-white text-sm hover:bg-neutral-800 disabled:opacity-50"
    >
      {loading ? "A adicionar..." : done ? "Adicionado ✅" : "In den Warenkorb"}
    </button>
  );
}
