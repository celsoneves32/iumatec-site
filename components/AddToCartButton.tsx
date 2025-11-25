"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import MediaMarktButton from "@/components/MediaMarktButton";

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

    // pequena animação
    setTimeout(() => setAdding(false), 500);
  };

  return (
    <MediaMarktButton
      type="button"
      onClick={handleClick}
      disabled={adding}
      variant="primary"
      size="md"
      fullWidth
    >
      {adding ? "Wird hinzugefügt..." : "In den Warenkorb"}
    </MediaMarktButton>
  );
}
