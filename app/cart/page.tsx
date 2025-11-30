// app/cart/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, clearCart, removeItem, updateQuantity } = useCart();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const hasItems = items.length > 0;

  const total = items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (!hasItems || loadingCheckout) return;

    try {
      setLoadingCheckout(true);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        console.error("Checkout error", await res.text());
        alert("Es gab ein Problem beim Weiterleiten zur Bezahlung.");
        setLoadingCheckout(false);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Kein Checkout-Link erhalten.");
        setLoadingCheckout(false);
      }
    } catch (err) {
      console.error(err);
      alert("Es gab ein Problem beim Weiterleiten zur Bezahlung.");
      setLoadingCheckout(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Warenkorb</h1>

      {!hasItems && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Dein Warenkorb ist noch leer.
          <div className="mt-4">
            <Link
              href="/produkte"
              className="inline-block px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
            >
              Jetzt einkaufen
            </Link>
          </div>
        </div>
      )}

      {hasItems && (
        <>
          <section className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-200">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-neutral-500">
                    {item.quantity} × CHF {item.price.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Controlo de quantidade*
