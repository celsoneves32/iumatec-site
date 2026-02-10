"use client";

import { useCart } from "@/context/CartContext";

export default function AddToCartButton({
  variantId,
  quantity = 1,
}: {
  variantId: string;
  quantity?: number;
}) {
  const { addItem, loading } = useCart();

  return (
    <button
      onClick={() => addItem(variantId, quantity)}
      disabled={loading}
      className="w-full rounded-lg bg-black px-4 py-2 text-white text-sm hover:bg-neutral-800 disabled:opacity-50"
    >
      {loading ? "A adicionar..." : "Adicionar ao carrinho"}
    </button>
  );
}
