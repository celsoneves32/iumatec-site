"use client";

type AddToCartButtonProps = {
  id: string;
  title: string;
  price: number;
};

export default function AddToCartButton({ id, title, price }: AddToCartButtonProps) {
  const handleClick = () => {
    // Evento GA4 de add_to_cart (exemplo – ajusta como quiseres)
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

    // Aqui depois integras com o teu carrinho real
    console.log("Add to cart:", { id, title, price });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
    >
      In den Warenkorb
    </button>
  );
}
