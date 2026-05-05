"use client";

import { useCart } from "@/context/CartContext";

export default function CheckoutButton() {
  const { checkoutUrl, totalQuantity, loading } = useCart();

  const disabled = !checkoutUrl || totalQuantity === 0 || loading;

  return (
    <a
      href={disabled ? "#" : checkoutUrl}
      aria-disabled={disabled}
      className={`inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-sm font-semibold text-white transition ${
        disabled
          ? "cursor-not-allowed bg-neutral-400"
          : "bg-black hover:opacity-90"
      }`}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
    >
      Zur Kasse
    </a>
  );
}