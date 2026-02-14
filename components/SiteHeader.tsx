"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

export default function SiteHeader() {
  const { totalItems } = useCart();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold tracking-tight">
          IUMATEC
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/products" className="hover:underline">
            Alle Produkte
          </Link>
          <Link href="/collections" className="hover:underline">
            Kategorien
          </Link>

          {ACCOUNT_URL && (
            <a href={ACCOUNT_URL} className="hover:underline" target="_self">
              Mein Konto
            </a>
          )}

          {/* Cart icon + badge */}
          <Link
            href="/cart"
            className="relative inline-flex items-center justify-center rounded-full border px-3 py-2 hover:bg-neutral-50"
            aria-label="Warenkorb"
          >
            <span className="text-base">🛒</span>

            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1 rounded-full bg-black text-white text-[11px] flex items-center justify-center leading-none">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
