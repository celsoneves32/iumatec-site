// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import CartStatus from "./CartStatus";
import AccountButton from "@/components/AccountButton";
import { CATEGORIES } from "@/lib/categories";

type MainNavItem = {
  label: string;
  href: string;
  slug?: string;
};

const mainNav: MainNavItem[] = [
  // Novo item principal com mega-menu
  {
    label: "Computer & Gaming",
    href: "/kategorie/computer-gaming",
    slug: "computer-gaming",
  },
  {
    label: "Smartphones & Wearables",
    href: "/kategorie/telefonie-tablet-smartwatch",
  },
  {
    label: "TV & Audio",
    href: "/kategorie/tv-audio",
  },
  {
    label: "Computer & Tablets",
    href: "/kategorie/computer-tablets",
  },
  {
    label: "Gaming & VR",
    href: "/kategorie/gaming-vr",
  },
  {
    label: "Haushalt & Küche",
    href: "/kategorie/haushalt-kueche",
  },
  {
    label: "Garten & Grill",
    href: "/kategorie/garten-grill",
  },
  {
    label: "Foto & Video",
    href: "/kategorie/foto-video",
  },
  {
    label: "Zubehör & Kabel",
    href: "/kategorie/zubehoer-kabel",
  },
  {
    label: "Aktionen",
    href: "/aktionen",
  },
];

// Subcategorias para o mega-menu de "Computer & Gaming"
const computerGamingChildren = CATEGORIES.filter(
  (cat) => cat.parentSlug === "computer-gaming"
);

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [computerMegaOpen, setComputerMegaOpen] = useState(false);

  return (
    <header className="border-b border-neutral-200 bg-white/90 backdrop-blur">
      {/* Top row: logo + right side */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo + Startseite */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo-iumatec.svg"
              alt="IUMATEC"
              className="h-7 w-auto"
            />
          </Link>

          {/* Desktop: Link Startseite / Produkte simples */}
          <nav className="hidden lg:flex items-center gap-4 text-xs font-medium text-neutral-700">
            <Link
              href="/"
              className="hover:text-red-600 transition-colors"
            >
              Startseite
            </Link>
            <Link
              href="/produkte"
              className="hover:text-red-600 transition-colors"
            >
              Alle Produkte
            </Link>
          </nav>
        </div>

        {/* Right side: Account + Cart + Mobile burger */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            <AccountButton />
            <CartStatus />
          </div>

          {/* Mobile: só ícones reduzidos */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/cart"
              aria-label="Warenkorb"
              className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white/80 h-9 w-9"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
              >
                <path
                  d="M7 4h-.8a1.2 1.2 0 0 0 0 2.4H7l1.2 8.1a2.4 2.4 0 0 0 2.4 2.1h5.8a1.2 1.2 0 0 0 0-2.4h-5.8l-.2-1.2h6.8a1.8 1.8 0 0 0 1.7-1.4l1-4.8A1.2 1.2 0 0 0 18.6 5H9.1L8.9 4.1A1.2 1.2 0 0 0 7.7 3H7Z"
                  fill="currentColor"
                />
              </svg>
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white/80 h-9 w-9"
              aria-label="Menü öffnen"
            >
              {mobileOpen ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop category bar – estilo MediaMarkt */}
      <div className="hidden lg:block border-t border-neutral-200 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-4 h-11 text-xs font-medium text-neutral-800">
            {mainNav.map((item) => {
              // Item especial: Computer & Gaming com mega-menu
              if (item.slug === "computer-gaming") {
                return (
                  <div
                    key={item.href}
                    className="relative h-full"
                    onMouseEnter={() => setComputerMegaOpen(true)}
                    onMouseLeave={() => setComputerMegaOpen(false)}
                  >
                    <Link
                      href={item.href}
                      className="inline-flex items-center h-full border-b-2 border-transparent hover:border-red-600 hover:text-red-600 transition-colors gap-1"
                    >
                      <span>{item.label}</span>
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-3 w-3"
                      >
                        <path
                          d="M7 9.5L12 14.5L17 9.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>

                    {/* Mega-menu Desktop */}
                    {computerMegaOpen && computerGamingChildren.length > 0 && (
                      <div className="absolute left-0 top-full mt-px w-[720px] bg-white border border-neutral-200 rounded-b-2xl shadow-lg z-30">
                        <div className="grid grid-cols-3 gap-4 p-4 text-xs">
                          {computerGamingChildren.map((cat) => (
                            <Link
                              key={cat.slug}
                              href={`/kategorie/${cat.slug}`}
                              className="group rounded-md px-2 py-1 hover:bg-neutral-50"
                            >
                              <div className="font-medium text-neutral-800 group-hover:text-red-600">
                                {cat.title}
                              </div>
                              {cat.description && (
                                <div className="mt-0.5 text-[11px] text-neutral-500 line-clamp-2">
                                  {cat.description}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Itens normais
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center h-full border-b-2 border-transparent hover:border-red-600 hover:text-red-600 transition-colors"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile menu com categorias (simples) */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-neutral-200 bg-white">
          <div className="px-4 py-3 space-y-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">
                Konto & Warenkorb
              </span>
              {/* mini Account link */}
              <Link
                href="/login"
                className="text-xs text-red-600 font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                Anmelden
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg border border-neutral-200 px-3 py-2 hover:border-red-500 hover:text-red-600"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-neutral-100 mt-3">
              <Link
                href="/produkte"
                className="block text-xs font-medium text-neutral-800 hover:text-red-600"
                onClick={() => setMobileOpen(false)}
              >
                Alle Produkte anzeigen
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
