"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function HeaderCartButton() {
  const { totalQuantity } = useCart();

  return (
    <Link
      href="/cart"
      className="relative flex items-center justify-center"
      aria-label="Warenkorb"
    >
      {/* Ícone do carrinho */}
      <span className="text-xl">🛒</span>

      {/* Badge */}
      {totalQuantity > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-black text-white text-[11px] flex items-center justify-center px-1">
          {totalQuantity}
        </span>
      )}
    </Link>
  );
}
