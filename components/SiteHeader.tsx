// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

const SHOPIFY_CUSTOMER_ACCOUNTS_URL =
  process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL || "";

export default function SiteHeader() {
  const cart = useCart();

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
          <Link href="/aktionen" className="hover:underline">
            Aktionen
          </Link>
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {/* Mein Konto (Shopify NEW Customer Accounts) */}
          {SHOPIFY_CUSTOMER_ACCOUNTS_URL ? (
            <a
              href={SHOPIFY_CUSTOMER_ACCOUNTS_URL}
              className="hover:underline"
              rel="noreferrer"
            >
              Mein Konto
            </a>
          ) : (
            <span className="text-neutral-400" title="Define NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL">
              Mein Konto
            </span>
          )}

          {/* Warenkorb */}
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-neutral-50"
          >
            <span>Warenkorb</span>
            <span className="min-w-6 text-center rounded-full bg-black px-2 py-0.5 text-xs text-white">
              {cart.ready ? cart.totalQuantity : 0}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
