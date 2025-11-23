"use client";
import { useCart } from "@/context/CartContext";

type AddToCartButtonProps = {
  id: string;
  title: string;
  price: number;
};

export default function AddToCartButton({ id, title, price }: AddToCartButtonProps) {
  const { addItem } = useCart();

  const handleClick = () => {
    addItem({ id, title, price, quantity: 1 });

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
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-red-700"
    >
      In den Warenkorb
    </button>
  );
}
