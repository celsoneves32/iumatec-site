"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

type Props = {
  variantId: string;
  className?: string;
};

export default function AddToCartButton({ variantId, className }: Props) {
  const { addItem, loading } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAddToCart() {
    try {
      setAdding(true);
      setAdded(false);
      await addItem({
  merchandiseId: variantId,
  quantity: 1,
});
      setAdded(true);

      setTimeout(() => {
        setAdded(false);
      }, 1800);
    } finally {
      setAdding(false);
    }
  }

  const disabled = loading || adding || !variantId;

  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={disabled}
      className={
        className ??
        "w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {adding
        ? "Wird hinzugefügt..."
        : added
        ? "Hinzugefügt ✓"
        : "In den Warenkorb"}
    </button>
  );
}