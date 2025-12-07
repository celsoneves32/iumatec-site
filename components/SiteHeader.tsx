// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import CartStatus from "./CartStatus";
import AccountButton from "@/components/AccountButton";
import { MEGA_MENU } from "@/lib/categories";

const topNav = [
  {
    label: "Computer & Gaming",
    href: "/kategorie/computer-gaming",
    mega: true,
  },
  {
    label: "Telefonie, Tablet & Smartwatch",
    href: "/kategorie/telefonie-tablet-und-smartwatch",
    mega: false,
  },
  {
    label: "TV & Audio",
    href: "/kategorie/tv-und-audio",
    mega: false,
  },
  {
    label: "Haushalt & Küche",
    href: "/kategorie/haushalt-und-kueche",
    mega: false,
  },
  {
    label: "Garten & Grill",
    href: "/kategorie/garten-und-grill",
    mega: false,
  },
  {
    label: "Foto & Video",
    href: "/kategorie/foto-und-video",
    mega: false,
  },
  {
    label: "Zubehör & Kabel",
    href: "/kategorie/zubehoer-und-kabel",
    mega: false,
  },
  {
    label: "Aktionen",
    href: "/kategorie/aktionen",
    mega: false,
  },
];

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

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
            <Link href="/" className="hover:text-red-600 transition-colors">
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
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
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
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
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

      {/* Desktop category bar + mega-menu */}
      <div className="hidden lg:block border-t border-neutral-200 bg-neutral-50 relative">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-4 h-11 text-xs font-medium text-neutral-800 overflow-x-auto">
            {topNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => setMegaOpen(item.mega ? true : false)}
                className="inline-flex items-center h-full border-b-2 border-transparent hover:border-red-600 hover:text-red-600 transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mega-menu só para "Computer & Gaming" */}
        {megaOpen && (
          <div
            className="absolute left-0 right-0 top-full bg-white border-t border-neutral-200 shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
            onMouseLeave={() => setMegaOpen(false)}
          >
            <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-xs">
              {MEGA_MENU.map((section) => (
                <div key={section.handle}>
                  <Link
                    href={`/kategorie/${section.handle}`}
                    className="font-semibold text-neutral-900 hover:text-red-600 mb-2 inline-block"
                  >
                    {section.title}
                  </Link>
                  {section.children.length > 0 && (
                    <ul className="space-y-1">
                      {section.children.map((child) => (
                        <li key={child.handle}>
                          <Link
                            href={`/kategorie/${child.handle}`}
                            className="text-neutral-600 hover:text-red-600"
                          >
                            {child.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu com categorias */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-neutral-200 bg-white">
          <div className="px-4 py-3 space-y-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">
                Konto & Warenkorb
              </span>
              <Link
                href="/login"
                className="text-xs text-red-600 font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                Anmelden
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {topNav.map((item) => (
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
