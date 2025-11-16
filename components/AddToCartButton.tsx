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
    gtagEvent({
      action: "add_to_cart",
      params: {
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
      },
    });

    // aqui depois ligamos ao carrinho real
  };

  return (
    <button
      onClick={handleClick}
      className="bg-brand-red text-white rounded-xl px-6 py-3 font-semibold hover:bg-brand-blue transition"
    >
      In den Warenkorb
    </button>
  );
}
