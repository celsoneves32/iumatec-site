"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

export default function SiteHeader() {
  const { cart, totalQuantity, loading } = useCart();
  const [open, setOpen] = useState(false);

  const totalAmount = useMemo(() => {
    const amount = cart?.cost?.totalAmount?.amount;
    const currency = cart?.cost?.totalAmount?.currencyCode;
    if (!amount || !currency) return null;
    return `${Number(amount).toFixed(2)} ${currency}`;
  }, [cart]);

  const lines = cart?.lines ?? [];

  return (
    <header className="bg-white sticky top-0 z-50 border-b shadow-sm">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt="IUMATEC" width={140} height={40} priority />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/products" className="text-neutral-800 hover:text-brand nav-underline">
            Alle Produkte
          </Link>

          <Link href="/collections" className="text-neutral-800 hover:text-brand nav-underline">
            Kategorien
          </Link>

          {ACCOUNT_URL && (
            <a href={ACCOUNT_URL} className="text-neutral-800 hover:text-brand nav-underline" target="_self">
              Mein Konto
            </a>
          )}

          {/* Mini-cart hover */}
          <div
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <Link
              href="/cart"
              className="relative inline-flex items-center justify-center rounded-full border border-neutral-300 px-3 py-2 hover:bg-neutral-50 transition"
              aria-label="Warenkorb"
            >
              <span className="text-lg">🛒</span>

              {totalQuantity > 0 && (
                <span className="absolute -right-2 -top-2 min-w-[20px] h-[20px] px-1 rounded-full bg-brand text-white text-[11px] flex items-center justify-center leading-none shadow-md">
                  {totalQuantity > 99 ? "99+" : totalQuantity}
                </span>
              )}
            </Link>

            {/* Dropdown */}
            {open && (
              <div className="absolute right-0 mt-3 w-[320px] rounded-2xl border bg-white shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Warenkorb</div>
                  <div className="text-xs text-neutral-500">{loading ? "…" : `${totalQuantity} Artikel`}</div>
                </div>

                <div className="mt-3 space-y-3 max-h-[260px] overflow-auto">
                  {lines.length === 0 ? (
                    <div className="text-sm text-neutral-600">
                      Dein Warenkorb ist leer.
                    </div>
                  ) : (
                    lines.slice(0, 5).map((l) => (
                      <div key={l.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {l.merchandise?.productTitle ?? "Produkt"}
                          </div>
                          <div className="text-xs text-neutral-500 truncate">
                            {l.merchandise?.title ?? ""}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">×{l.quantity}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <div className="text-sm text-neutral-600">Total</div>
                  <div className="text-sm font-semibold">{totalAmount ?? "—"}</div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    href="/cart"
                    className="flex-1 text-center rounded-xl border border-neutral-300 py-2 text-sm hover:bg-neutral-50 transition"
                  >
                    Warenkorb
                  </Link>
                  <Link
                    href="/cart"
                    className="flex-1 text-center rounded-xl bg-brand py-2 text-sm text-white hover:bg-brand-dark transition"
                  >
                    Zur Kasse
                  </Link>
                </div>

                <div className="mt-2 text-xs text-neutral-500">
                  (Dropdown mostra até 5 items)
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
