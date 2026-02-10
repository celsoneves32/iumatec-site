"use client";

import { useCart } from "@/context/CartContext";

export default function AddToCartButton({
  variantId,
}: {
  variantId: string;
}) {
  const { addItem, loading } = useCart();

  return (
    <button
      onClick={() => addItem(variantId, 1)}
      disabled={loading}
      className="rounded-lg bg-black px-4 py-2 text-white"
    >
      In den Warenkorb
    </button>
  );
}
