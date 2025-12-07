// components/AddToCartButton.tsx
"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

type AddToCartButtonProps = {
  id: string;
  title: string;
  price: number;
};

export default function AddToCartButton({
  id,
  title,
  price,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);

    // In den Warenkorb legen
    addItem({ id, title, price, quantity: 1 });

    // Optional: Google Analytics / gtag Event
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "add_to_cart", {
        currency: "CHF",
        value: price,
        items: [
          {
            item_id: id,
            item_name: title,
            price,
            quantity: 1,
          },
        ],
      });
    }

    // Kurz Loading anzeigen (nur optisch)
    setTimeout(() => setLoading(false), 200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? "Wird hinzugefügt…" : "In den Warenkorb"}
    </button>
  );
}
