"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

type CategoryGroup = {
  name: string;
  subcategories: string[];
};

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
      className="relative text-sm font-medium text-neutral-700 transition hover:text-neutral-900
                 after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
                 after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                 hover:after:scale-x-100"
    >
      {children}
    </Link>
  );
}

function SearchBarDesktop() {
  return (
    <form action="/produkte" method="GET" className="mx-6 hidden flex-1 lg:flex xl:mx-8">
      <div className="relative w-full">
        <input
          type="text"
          name="q"
          placeholder="Suche nach Produkt, Marke oder SKU"
          className="w-full rounded-2xl border border-neutral-300 bg-neutral-50 px-5 py-3 pr-28 text-sm text-neutral-900 outline-none transition focus:border-brand focus:bg-white"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand"
        >
          Suchen
        </button>
      </div>
    </form>
  );
}

function MegaMenuDesktop({ categories }: { categories: CategoryGroup[] }) {
  return (
    <div className="hidden items-center gap-6 xl:flex">
      <div className="group relative">
        <button
          type="button"
          className="relative text-sm font-medium text-neutral-700 transition hover:text-neutral-900"
        >
          Kategorien
        </button>

        <div className="pointer-events-none absolute left-1/2 top-full z-50 w-[1080px] -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="grid grid-cols-4 gap-x-8 gap-y-8">
              {categories.map((group) => (
                <div key={group.name}>
                  <Link
                    href={`/produkte?category=${encodeURIComponent(group.name)}`}
                    className="mb-3 inline-block text-sm font-semibold text-neutral-900 hover:text-brand"
                  >
                    {group.name}
                  </Link>

                  <ul className="space-y-2">
                    {group.subcategories.slice(0, 8).map((item) => (
                      <li key={item}>
                        <Link
                          href={`/produkte?category=${encodeURIComponent(group.name)}&subcategory=${encodeURIComponent(item)}`}
                          className="text-sm text-neutral-600 transition hover:text-brand"
                        >
                          {item}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <NavLink href="/produkte">Alle Produkte</NavLink>

      {ACCOUNT_URL ? (
        <a
          href={ACCOUNT_URL}
          className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
        >
          Mein Konto
        </a>
      ) : (
        <NavLink href="/konto">Mein Konto</NavLink>
      )}
    </div>
  );
}

function MobileMenu({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryGroup[];
}) {
  if (!open) return null;

  return (
    <div className="border-t border-neutral-200 bg-white xl:hidden">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <form action="/produkte" method="GET" className="mb-4">
          <input
            type="text"
            name="q"
            placeholder="Suche nach Produkt, Marke oder SKU"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </form>

        <div className="space-y-6">
          <Link
            href="/produkte"
            onClick={onClose}
            className="block text-sm font-semibold text-neutral-900"
          >
            Alle Produkte
          </Link>

          {ACCOUNT_URL ? (
            <a
              href={ACCOUNT_URL}
              onClick={onClose}
              className="block text-sm font-semibold text-neutral-900"
            >
              Mein Konto
            </a>
          ) : (
            <Link
              href="/konto"
              onClick={onClose}
              className="block text-sm font-semibold text-neutral-900"
            >
              Mein Konto
            </Link>
          )}

          <Link
            href="/merken"
            onClick={onClose}
            className="block text-sm font-semibold text-neutral-900"
          >
            Merken
          </Link>

          <Link
            href="/compare"
            onClick={onClose}
            className="block text-sm font-semibold text-neutral-900"
          >
            Vergleichen
          </Link>

          {categories.map((group) => (
            <div key={group.name}>
              <Link
                href={`/produkte?category=${encodeURIComponent(group.name)}`}
                onClick={onClose}
                className="mb-2 block text-sm font-semibold text-neutral-900"
              >
                {group.name}
              </Link>

              <ul className="space-y-2 pl-3">
                {group.subcategories.slice(0, 8).map((sub) => (
                  <li key={sub}>
                    <Link
                      href={`/produkte?category=${encodeURIComponent(group.name)}&subcategory=${encodeURIComponent(sub)}`}
                      onClick={onClose}
                      className="text-sm text-neutral-600 hover:text-brand"
                    >
                      {sub}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M3 4h2l1.2 6.2A2 2 0 0 0 8.2 12H17a2 2 0 0 0 2-1.6L20 6H7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="19" r="1.4" fill="currentColor" />
      <circle cx="17" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}

function TopBar() {
  return (
    <div className="hidden border-b border-neutral-200 bg-neutral-50 lg:block">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-4 text-xs text-neutral-600">
        <div className="flex items-center gap-6">
          <span>✅ Schnelle Lieferung in der Schweiz</span>
          <span>✅ Support innerhalb 24h</span>
          <span>✅ Sichere Bezahlung</span>
        </div>

        <div className="flex items-center gap-5">
          <Link href="/versand-lieferung" className="hover:text-neutral-900">
            Versand & Lieferung
          </Link>
          <Link href="/retouren" className="hover:text-neutral-900">
            Retouren
          </Link>
          <Link href="/kontakt" className="hover:text-neutral-900">
            Kontakt
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SiteHeader() {
  const { totalQuantity, openDrawer } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const categories = useMemo<CategoryGroup[]>(
    () => [
      {
        name: "Computer",
        subcategories: ["Laptops", "Desktop-PCs", "Mini PCs", "Workstations"],
      },
      {
        name: "Peripherie",
        subcategories: ["Monitors", "Tastaturen", "Mäuse", "Dockingstationen"],
      },
      {
        name: "Netzwerk",
        subcategories: ["Router", "Switches", "WLAN Mesh"],
      },
      {
        name: "Mobile",
        subcategories: ["Smartphones", "Tablets", "Zubehör"],
      },
    ],
    []
  );

  return (
    <header className="sticky top-0 z-50 bg-white">
      <TopBar />

      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-20 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-2 py-2 text-neutral-700 xl:hidden"
                aria-label="Menü öffnen"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <Link href="/" className="flex items-center">
                <Image
                  src="/logo-iumatec.svg"
                  alt="IUMATEC"
                  width={170}
                  height={42}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
            </div>

            <SearchBarDesktop />

            <MegaMenuDesktop categories={categories} />

            <div className="flex items-center gap-3">
              <Link
                href="/merken"
                className="hidden rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 xl:inline-flex"
              >
                Merken
              </Link>

              <Link
                href="/compare"
                className="hidden rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 xl:inline-flex"
              >
                Vergleichen
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openDrawer();
                }}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-brand hover:text-brand"
                aria-label="Warenkorb öffnen"
              >
                <CartIcon />
                {totalQuantity > 0 ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {totalQuantity}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      </div>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        categories={categories}
      />
    </header>
  );
}