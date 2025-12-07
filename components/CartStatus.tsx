// components/CartStatus.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartStatus() {
  const { items } = useCart();

  const itemCount = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-xs font-medium text-neutral-800 hover:border-red-500 hover:text-red-600"
    >
      {/* Ícone simples de carrinho em SVG */}
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-3 w-3"
        >
          <path
            d="M7 4h-.8a1.2 1.2 0 0 0 0 2.4H7l1.2 8.1a2.4 2.4 0 0 0 2.4 2.1h5.8a1.2 1.2 0 0 0 0-2.4h-5.8l-.2-1.2h6.8a1.8 1.8 0 0 0 1.7-1.4l1-4.8A1.2 1.2 0 0 0 18.6 5H9.1L8.9 4.1A1.2 1.2 0 0 0 7.7 3H7Z"
            fill="currentColor"
          />
        </svg>
      </span>

      <span>Warenkorb</span>

      <span className="inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white min-w-[1.75rem] text-center">
        {itemCount}
      </span>
    </Link>
  );
}
