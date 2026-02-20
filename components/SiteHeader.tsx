"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useCart } from "@/context/CartContext";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative text-sm font-medium text-neutral-800 hover:text-brand transition-colors
                 after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:origin-left
                 after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                 hover:after:scale-x-100"
    >
      {children}
    </Link>
  );
}

export default function SiteHeader() {
  const { cart, totalQuantity } = useCart();

  const miniLines = useMemo(() => {
    const lines = cart?.lines ?? [];
    return lines.slice(0, 4);
  }, [cart]);

  const totalAmount = cart?.cost?.totalAmount?.amount;
  const currency = cart?.cost?.totalAmount?.currencyCode;

  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="IUMATEC"
            width={120}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-5">
          <NavLink href="/products">Alle Produkte</NavLink>
          <NavLink href="/collections">Kategorien</NavLink>

          {ACCOUNT_URL && (
            <a
              href={ACCOUNT_URL}
              className="relative text-sm font-medium text-neutral-800 hover:text-brand transition-colors
                         after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:origin-left
                         after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                         hover:after:scale-x-100"
              target="_self"
            >
              Mein Konto
            </a>
          )}

          {/* Cart (hover dropdown) */}
          <div className="relative group">
            <Link
              href="/cart"
              className="relative inline-flex items-center justify-center rounded-full border px-3 py-2
                         hover:bg-neutral-50 transition"
              aria-label="Warenkorb"
            >
              <span className="text-base">🛒</span>

              {totalQuantity > 0 && (
                <span className="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px]
                                 flex items-center justify-center leading-none">
                  {totalQuantity > 99 ? "99+" : totalQuantity}
                </span>
              )}
            </Link>

            {/* Dropdown */}
            <div
              className="pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                         group-hover:pointer-events-auto transition duration-150
                         absolute right-0 mt-2 w-80 rounded-xl border bg-white shadow-lg"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Warenkorb</p>
                  <p className="text-sm text-neutral-500">{totalQuantity} Artikel</p>
                </div>

                <div className="mt-3 space-y-2">
                  {miniLines.length === 0 ? (
                    <p className="text-sm text-neutral-600">Dein Warenkorb ist leer.</p>
                  ) : (
                    miniLines.map((l) => (
                      <div key={l.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {l.merchandise?.productTitle || "Produkt"}
                          </p>
                          <p className="text-neutral-500 truncate">
                            {l.merchandise?.title || ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-neutral-700">× {l.quantity}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 border-t pt-3 flex items-center justify-between">
                  <p className="text-sm text-neutral-600">Total</p>
                  <p className="font-semibold">
                    {totalAmount ? `${totalAmount} ${currency ?? ""}` : "—"}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/cart"
                    className="rounded-lg border px-3 py-2 text-center text-sm hover:bg-neutral-50 transition"
                  >
                    Ansehen
                  </Link>
                  <Link
                    href="/cart"
                    className="rounded-lg bg-brand px-3 py-2 text-center text-sm text-white hover:bg-brand-dark transition"
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* linha fina com gradiente suave */}
      <div className="h-[2px] w-full bg-gradient-to-r from-brand/0 via-brand/70 to-brand/0" />
    </header>
  );
}
