"use client";

import { gtagEvent } from "@/lib/gtag";

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
  const handleClick = () => {
    // Log no console para ver se o clique está a funcionar
    console.log("[ADD_TO_CART] click", { id, title, price });

    // Evento GA4: add_to_cart
    gtagEvent("add_to_cart", {
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
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-brand-red text-white rounded-xl px-6 py-3 font-semibold hover:bg-brand-blue transition"
    >
      In den Warenkorb
    </button>
  );
}
