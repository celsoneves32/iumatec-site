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

function categoryHref(category: string, subcategory?: string) {
  const params = new URLSearchParams();
  params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  return `/produkte?${params.toString()}`;
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
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const categories = useMemo<CategoryGroup[]>(
    () => [
      {
        name: "Computer",
        subcategories: ["Laptops", "Desktop-PCs", "Mini PCs"],
      },
      {
        name: "PC-Komponenten",
        subcategories: [
          "Grafikkarten",
          "Arbeitsspeicher",
          "Mainboards",
          "Netzteile",
        ],
      },
      {
        name: "Peripherie",
        subcategories: [
          "Monitors",
          "Tastaturen",
          "Mäuse",
          "Headsets",
          "Webcams",
          "Mikrofone",
          "Dockingstationen",
        ],
      },
      {
        name: "Mobile",
        subcategories: ["Smartphones", "Tablets", "Zubehör"],
      },
      {
        name: "Netzwerk",
        subcategories: ["Router", "Netzwerk-Switches", "WLAN Mesh"],
      },
      {
        name: "Büro & Drucker",
        subcategories: ["Drucker", "Tinte & Toner", "Papier & Etiketten"],
      },
      {
        name: "Datenspeicher",
        subcategories: ["SSD & Festplatten", "NAS"],
      },
      {
        name: "Smart Home",
        subcategories: ["Kameras", "Haushalt"],
      },
      {
        name: "Zubehör",
        subcategories: ["Notebook-Zubehör", "Sonstiges Zubehör"],
      },
    ],
    []
  );

  return (
    <header className="sticky top-0 z-50 bg-white">
      <TopBar />

      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-20 items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex rounded-xl border border-neutral-300 p-2 xl:hidden"
              aria-label="Menü öffnen"
            >
              ☰
            </button>

            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/logo-iumatec.svg"
                alt="IUMATEC"
                width={150}
                height={38}
                className="h-9 w-auto"
                priority
              />
            </Link>

            <form action="/produkte" method="GET" className="hidden flex-1 lg:block">
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  placeholder="Suche nach Produkt, Marke oder SKU"
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-5 py-3 pr-28 text-sm outline-none focus:border-neutral-900"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-neutral-950 px-5 py-2 text-sm font-bold text-white"
                >
                  Suchen
                </button>
              </div>
            </form>

            <nav className="ml-auto hidden items-center gap-6 xl:flex">
              <div
                className="relative"
                onMouseEnter={() => setMegaOpen(true)}
                onMouseLeave={() => setMegaOpen(false)}
              >
                <button
                  type="button"
                  className="text-sm font-bold text-neutral-800 hover:text-red-600"
                >
                  Kategorien
                </button>

                {megaOpen ? (
                  <div className="absolute right-[-260px] top-full z-50 w-[1120px] pt-5">
                    <div className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl">
                      <div className="grid grid-cols-5 gap-8">
                        {categories.map((group) => (
                          <div key={group.name}>
                            <Link
                              href={categoryHref(group.name)}
                              className="mb-3 block text-sm font-extrabold text-neutral-950 hover:text-red-600"
                            >
                              {group.name}
                            </Link>

                            <ul className="space-y-2">
                              {group.subcategories.map((sub) => (
                                <li key={sub}>
                                  <Link
                                    href={categoryHref(group.name, sub)}
                                    className="text-sm text-neutral-600 hover:text-red-600"
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
                ) : null}
              </div>

              {ACCOUNT_URL ? (
                <a
                  href={ACCOUNT_URL}
                  className="text-sm font-bold text-neutral-800 hover:text-red-600"
                >
                  Mein Konto
                </a>
              ) : (
                <Link
                  href="/konto"
                  className="text-sm font-bold text-neutral-800 hover:text-red-600"
                >
                  Mein Konto
                </Link>
              )}
            </nav>

            <button
              type="button"
              onClick={openDrawer}
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 text-neutral-800 hover:border-red-600 hover:text-red-600"
              aria-label="Warenkorb öffnen"
            >
              <CartIcon />
              {totalQuantity > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                  {totalQuantity}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-b border-neutral-200 bg-white xl:hidden">
          <div className="mx-auto max-w-7xl px-4 py-5">
            <form action="/produkte" method="GET" className="mb-5">
              <input
                type="text"
                name="q"
                placeholder="Suche nach Produkt, Marke oder SKU"
                className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none"
              />
            </form>

            <div className="grid gap-6 sm:grid-cols-2">
              {categories.map((group) => (
                <div key={group.name}>
                  <Link
                    href={categoryHref(group.name)}
                    onClick={() => setMobileOpen(false)}
                    className="mb-2 block font-extrabold text-neutral-950"
                  >
                    {group.name}
                  </Link>

                  <div className="space-y-1">
                    {group.subcategories.map((sub) => (
                      <Link
                        key={sub}
                        href={categoryHref(group.name, sub)}
                        onClick={() => setMobileOpen(false)}
                        className="block text-sm text-neutral-600"
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}