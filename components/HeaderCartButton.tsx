"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function HeaderCartButton() {
  const { totalQuantity, loading } = useCart();

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center justify-center rounded-lg px-2 py-1 hover:bg-neutral-100 transition"
      aria-label="Warenkorb"
      title="Warenkorb"
    >
      <span className="text-lg leading-none">🛒</span>

      {totalQuantity > 0 && (
        <span
          className={[
            "absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full",
            "bg-black text-white text-[11px] flex items-center justify-center px-1",
            loading ? "opacity-60" : "opacity-100",
          ].join(" ")}
        >
          {totalQuantity}
        </span>
      )}
    </Link>
  );
}
