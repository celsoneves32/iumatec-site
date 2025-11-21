"use client";

type CheckoutButtonProps = {
  items: {
    id: string;
    title: string;
    price: number;
    quantity: number;
  }[];
};

export default function CheckoutButton({ items }: CheckoutButtonProps) {
  const handleCheckout = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Fehler beim Checkout.");
        return;
      }

      if (data.url) {
        window.location.href = data.url; // redireciona para Stripe
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Unerwarteter Fehler beim Checkout.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
    >
      Jetzt bezahlen
    </button>
  );
}
