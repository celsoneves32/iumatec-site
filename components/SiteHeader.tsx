"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

export default function SiteHeader() {
  const { totalQuantity } = useCart();

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="IUMATEC"
            width={140}
            height={40}
            priority
          />
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium">
          
          <Link
            href="/products"
            className="text-neutral-700 hover:text-brand transition"
          >
            Alle Produkte
          </Link>

          <Link
            href="/collections"
            className="text-neutral-700 hover:text-brand transition"
          >
            Kategorien
          </Link>

          {ACCOUNT_URL && (
            <a
              href={ACCOUNT_URL}
              className="text-neutral-700 hover:text-brand transition"
            >
              Mein Konto
            </a>
          )}

          {/* Cart */}
          <Link
            href="/cart"
            className="relative inline-flex items-center justify-center rounded-full border border-neutral-300 px-3 py-2 hover:bg-neutral-50 transition"
          >
            <span className="text-lg">🛒</span>

            {totalQuantity > 0 && (
              <span className="absolute -right-2 -top-2 min-w-[20px] h-[20px] px-1 rounded-full bg-brand text-white text-[11px] flex items-center justify-center leading-none shadow-md">
                {totalQuantity > 99 ? "99+" : totalQuantity}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
