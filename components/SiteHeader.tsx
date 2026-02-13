"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

export default function SiteHeader() {
  const { totalQuantity } = useCart();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
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

          <Link href="/search" className="hover:underline">
            Suche
          </Link>

          {ACCOUNT_URL && (
            <a href={ACCOUNT_URL} className="hover:underline" target="_self">
              Mein Konto
            </a>
          )}

          {/* 🛒 Cart Icon + Badge */}
          <Link
            href="/cart"
            className="relative inline-flex items-center justify-center rounded-lg border px-3 py-2 hover:bg-neutral-50 transition"
            aria-label="Warenkorb"
            title="Warenkorb"
          >
            <span className="text-lg leading-none">🛒</span>

            {totalQuantity > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-black text-white text-xs flex items-center justify-center">
                {totalQuantity}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
