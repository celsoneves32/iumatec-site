"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative text-sm font-medium text-neutral-700 hover:text-neutral-900 transition
                 after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
                 after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                 hover:after:scale-x-100"
    >
      {children}
    </Link>
  );
}

export default function SiteHeader() {
  const { cart, totalQuantity, goToCheckout } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const lines = cart?.lines ?? [];

  const subtotal = useMemo(() => {
    const amt = cart?.cost?.totalAmount?.amount;
    const cur = cart?.cost?.totalAmount?.currencyCode;
    if (!amt || !cur) return null;
    const n = Number(amt);
    if (Number.isNaN(n)) return `${amt} ${cur}`;
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: cur,
    }).format(n);
  }, [cart?.cost?.totalAmount?.amount, cart?.cost?.totalAmount?.currencyCode]);

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b border-neutral-200 bg-white/85 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85",
        scrolled ? "shadow-sm" : "",
      ].join(" ")}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo-iumatec.svg"
              alt="IUMATEC"
              width={140}
              height={32}
              className="h-7 w-auto"
              priority
            />
            <span className="sr-only">IUMATEC</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-6">
            <NavLink href="/collections">Kategorien</NavLink>
            <NavLink href="/collections/laptops">Computer</NavLink>
            <NavLink href="/collections/komponenten">PC-Komponenten</NavLink>
            <NavLink href="/collections/tastaturen">Peripherie</NavLink>
            <NavLink href="/collections/netzwerk">Netzwerk</NavLink>
            <NavLink href="/collections/smartphones">Mobile</NavLink>
            <NavLink href="/collections/smart-home">Smart Home</NavLink>

            {ACCOUNT_URL && (
              <a
                href={ACCOUNT_URL}
                target="_self"
                className="relative text-sm font-medium text-neutral-700 hover:text-neutral-900 transition
                           after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
                           after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                           hover:after:scale-x-100 dark:text-neutral-300 dark:hover:text-white"
              >
                Mein Konto
              </a>
            )}
          </nav>

          {/* Desktop Search */}
          <form
            action="/search"
            className="hidden lg:flex items-center flex-1 max-w-sm"
          >
            <input
              type="text"
              name="q"
              placeholder="Suche nach Produkten..."
              className="w-full rounded-l-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              className="rounded-r-xl border border-l-0 border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              aria-label="Suchen"
            >
              🔍
            </button>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Mobile quick links */}
            <div className="md:hidden flex items-center gap-3">
              <Link
                href="/products"
                className="text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              >
                Produkte
              </Link>
              <Link
                href="/collections"
                className="text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              >
                Kategorien
              </Link>
            </div>

            {/* Mobile Search button */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="inline-flex lg:hidden items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              aria-label="Suche öffnen"
            >
              <span className="text-base">🔍</span>
            </button>

            {/* Cart */}
            <div className="relative group">
              <Link
                href="/cart"
                className="relative inline-flex items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                aria-label="Warenkorb"
              >
                <span className="text-base">🛒</span>

                {totalQuantity > 0 && (
                  <span
                    className="absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1 rounded-full
                               bg-brand text-white text-[11px] flex items-center justify-center leading-none"
                  >
                    {totalQuantity > 99 ? "99+" : totalQuantity}
                  </span>
                )}
              </Link>

              {/* Dropdown */}
              <div
                className="pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                           group-hover:pointer-events-auto transition absolute right-0 mt-2 w-[320px]
                           rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden"
              >
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Warenkorb
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      {totalQuantity > 0 ? `${totalQuantity} Artikel` : "leer"}
                    </div>
                  </div>
                </div>

                <div className="max-h-[280px] overflow-auto">
                  {lines.length === 0 ? (
                    <div className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                      Dein Warenkorb ist leer.
                    </div>
                  ) : (
                    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {lines.slice(0, 6).map((l) => (
                        <li key={l.id} className="p-4">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1">
                            {l.merchandise?.productTitle ?? "Produkt"}
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <div className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1">
                              {l.merchandise?.title ?? ""}
                            </div>
                            <div className="text-xs text-neutral-700 dark:text-neutral-300">
                              x{l.quantity}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700 dark:text-neutral-300">
                      Zwischensumme
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {subtotal ?? "—"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href="/cart"
                      className="rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-semibold
                                 hover:bg-white dark:hover:bg-neutral-900 transition text-center"
                    >
                      Ansehen
                    </Link>

                    <button
                      type="button"
                      onClick={() => goToCheckout()}
                      disabled={lines.length === 0}
                      className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white
                                 hover:bg-brand-dark transition disabled:opacity-50"
                    >
                      Checkout
                    </button>
                  </div>

                  {lines.length > 6 && (
                    <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                      + weitere Artikel im Warenkorb…
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CTA Shop */}
            <Link
              href="/products"
              className="hidden sm:inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition"
            >
              Shop
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="pb-4 lg:hidden">
            <form action="/search" className="flex items-center">
              <input
                type="text"
                name="q"
                placeholder="Suche nach Produkten..."
                className="w-full rounded-l-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-500"
              />
              <button
                type="submit"
                className="rounded-r-xl border border-l-0 border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                aria-label="Suchen"
              >
                🔍
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
