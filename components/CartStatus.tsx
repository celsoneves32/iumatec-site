// components/CartStatus.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartStatus() {
  const { items } = useCart();

  const count = items.reduce(
    (sum: number, item: any) => sum + (item.quantity ?? 1),
    0
  );

  const hasItems = count > 0;

  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
    >
      <span>Warenkorb</span>
      {hasItems && (
        <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-white text-red-600 text-xs font-bold px-2">
          {count}
        </span>
      )}
    </Link>
  );
}
