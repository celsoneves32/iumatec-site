// components/CartStatus.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

function CartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.5 11h11L21 9H8" />
    </svg>
  );
}

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
      className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-100 transition"
    >
      <CartIcon className="h-5 w-5" />
      <span className="hidden sm:inline">Warenkorb</span>
      {hasItems && (
        <span className="inline-flex items-center justify-center min-w-[22px] h-5 rounded-full bg-red-600 text-white text-xs font-bold px-1.5">
          {count}
        </span>
      )}
    </Link>
  );
}
