"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function HeaderCartButton() {
  const { totalQuantity } = useCart();

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center justify-center"
      aria-label="Warenkorb"
    >
      {/* Ícone carrinho */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.3 2.6A1 1 0 007 17h10a1 1 0 001-1m-9 4a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0z"
        />
      </svg>

      {/* BADGE */}
      {totalQuantity > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-black text-white text-xs flex items-center justify-center px-1">
          {totalQuantity}
        </span>
      )}
    </Link>
  );
}
