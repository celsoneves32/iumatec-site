"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartStatus() {
  const { totalItems } = useCart();

  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-2 rounded-full border border-red-600 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
    >
      <span>Warenkorb</span>
      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full bg-red-600 text-white text-xs">
        {totalItems}
      </span>
    </Link>
  );
}
