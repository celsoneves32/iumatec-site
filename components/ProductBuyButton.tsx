"use client";

import { useCart } from "@/context/CartContext";

type Props = {
  merchandiseId: string | null;
  productHandle: string;
  imageUrl?: string | null;
  disabled?: boolean;
};

export default function ProductBuyButton({
  merchandiseId,
  productHandle,
  imageUrl,
  disabled,
}: Props) {
  const { addItem, loading } = useCart();

  const canBuy = Boolean(merchandiseId) && !disabled;

  return (
    <button
      type="button"
      disabled={!canBuy || loading}
      onClick={() =>
        canBuy
          ? void addItem({
              merchandiseId,
              productHandle,
              quantity: 1,
              imageUrl: imageUrl ?? null,
            })
          : undefined
      }
      className={`flex-1 rounded-2xl py-4 text-lg font-extrabold transition ${
        canBuy
          ? "bg-red-600 text-white hover:bg-red-700"
          : "cursor-not-allowed bg-neutral-200 text-neutral-500"
      }`}
    >
      {loading ? "..." : canBuy ? "In den Warenkorb" : "Nicht verfügbar"}
    </button>
  );
}