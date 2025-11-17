"use client";

type AddToCartButtonProps = {
  productId: string;
  productName: string;
  price: number;
};

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default function AddToCartButton({
  productId,
  productName,
  price,
}: AddToCartButtonProps) {
  const handleClick = () => {
    // Evento GA4 – add_to_cart
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "add_to_cart", {
        currency: "CHF",
        value: price,
        items: [
          {
            item_id: productId,
            item_name: productName,
            price,
            quantity: 1,
          },
        ],
      });
      console.log("GA4 add_to_cart enviado:", {
        productId,
        productName,
        price,
      });
    } else {
      console.log("gtag ainda não está disponível");
    }

    // 👉 Aqui mais tarde vamos pôr a lógica real do carrinho
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
