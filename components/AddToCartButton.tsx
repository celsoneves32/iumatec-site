"use client";

import { useCart } from "@/context/CartContext";
import { useState } from "react";

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
  const [adding, setAdding] = useState(false);

  const handleClick = () => {
    setAdding(true);

    // Adiciona ao carrinho
    addItem({ id, title, price, quantity: 1 });

    // Evento Google Analytics
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

    // animação curta
    setTimeout(() => setAdding(false), 500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={adding}
      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold shadow 
      transition-all duration-200 
      text-white
      ${
        adding
          ? "bg-red-700 cursor-default"
          : "bg-red-600 hover:bg-red-700 active:scale-[0.98]"
      }`}
    >
      {adding ? "Wird hinzugefügt..." : "In den Warenkorb"}
    </button>
  );
}
