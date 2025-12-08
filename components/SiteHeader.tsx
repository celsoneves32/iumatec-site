// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import CartStatus from "./CartStatus";
import AccountButton from "@/components/AccountButton";

const mainNav = [
  {
    key: "computer-gaming",
    label: "Computer & Gaming",
    href: "/kategorie/computer-gaming",
    hasMega: true,
  },
  {
    key: "telefonie",
    label: "Telefonie, Tablet & Smartwatch",
    href: "/kategorie/telefonie-tablet-smartwatch",
  },
  {
    key: "tv-audio",
    label: "TV & Audio",
    href: "/kategorie/tv-audio",
  },
  {
    key: "haushalt",
    label: "Haushalt & Küche",
    href: "/kategorie/haushalt-kueche",
  },
  {
    key: "garten",
    label: "Garten & Grill",
    href: "/kategorie/garten-grill",
  },
  {
    key: "foto-video",
    label: "Foto & Video",
    href: "/kategorie/foto-video",
  },
  {
    key: "zubehoer",
    label: "Zubehör & Kabel",
    href: "/kategorie/zubehoer-kabel",
  },
  {
    key: "aktionen",
    label: "Aktionen",
    href: "/aktionen",
  },
];

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-neutral-200 bg-white/90 backdrop-blur relative z-40">
      {/* Top row: logo + account/cart */}
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

          {/* Desktop: Startseite / Alle Produkte */}
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

          {/* Mobile icons */}
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

      {/* Desktop category bar + mega-menu */}
      <div className="hidden lg:block border-t border-neutral-200 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-4 h-11 text-xs font-medium text-neutral-800">
            {mainNav.map((item) =>
              item.hasMega ? (
                <div
                  key={item.key}
                  className="relative h-full flex items-stretch group"
                >
                  <Link
                    href={item.href}
                    className="inline-flex items-center h-full border-b-2 border-transparent group-hover:border-red-600 group-hover:text-red-600 transition-colors px-1"
                  >
                    {item.label}
                  </Link>

                  {/* MEGA-MENU – z-50 para ficar por cima do hero */}
                  <div className="absolute left-0 right-0 top-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] border-b border-neutral-200 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-150 z-50">
                    <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-7 gap-6 text-[13px] text-neutral-800">
                      {/* Colunas principais – ajusta como quiseres */}
                      <div className="space-y-1">
                        <div className="font-semibold mb-1">
                          Computer &amp; Gaming
                        </div>
                        <Link href="/kategorie/gaming" className="block hover:text-red-600">
                          Gaming
                        </Link>
                        <Link href="/kategorie/spielkonsolen" className="block hover:text-red-600">
                          Spielkonsolen
                        </Link>
                        <Link href="/kategorie/spielkonsolen-games" className="block hover:text-red-600">
                          Spielkonsolen Games
                        </Link>
                        <Link href="/kategorie/spielkonsolen-zubehoer" className="block hover:text-red-600">
                          Spielkonsolen Zubehör
                        </Link>
                        <Link href="/kategorie/pc-games" className="block hover:text-red-600">
                          PC Games
                        </Link>
                        <Link href="/kategorie/vr-brillen" className="block hover:text-red-600">
                          VR-Brillen
                        </Link>
                        <Link href="/kategorie/gaming-stuehle" className="block hover:text-red-600">
                          Gaming Stühle
                        </Link>
                        <Link href="/kategorie/spielsteuerungen" className="block hover:text-red-600">
                          Spielsteuerungen
                        </Link>
                        <Link href="/kategorie/gamecards-prepaid" className="block hover:text-red-600">
                          Gamecards &amp; Prepaid-Karten
                        </Link>
                      </div>

                      <div className="space-y-1">
                        <div className="font-semibold mb-1">Notebooks</div>
                        <Link href="/kategorie/notebooks" className="block hover:text-red-600">
                          Notebooks
                        </Link>
                        <Link href="/kategorie/notebook-akku" className="block hover:text-red-600">
                          Notebook Akku
                        </Link>
                        <Link href="/kategorie/notebook-netzteil" className="block hover:text-red-600">
                          Notebook Netzteil
                        </Link>
                        <Link href="/kategorie/notebook-dockingstation" className="block hover:text-red-600">
                          Notebook Dockingstation
                        </Link>
                        <Link href="/kategorie/notebook-zubehoer" className="block hover:text-red-600">
                          Notebook Zubehör
                        </Link>
                        <Link href="/kategorie/notebook-taschen" className="block hover:text-red-600">
                          Taschen &amp; Hüllen Notebooks
                        </Link>
                      </div>

                      <div className="space-y-1">
                        <div className="font-semibold mb-1">Speicher &amp; Laufwerke</div>
                        <Link href="/kategorie/ssd" className="block hover:text-red-600">
                          SSD
                        </Link>
                        <Link href="/kategorie/hdd-festplatten" className="block hover:text-red-600">
                          HDD Festplatten
                        </Link>
                        <Link href="/kategorie/usb-sticks" className="block hover:text-red-600">
                          USB Sticks
                        </Link>
                        <Link href="/kategorie/crypto-wallet" className="block hover:text-red-600">
                          Crypto Wallet
                        </Link>
                      </div>

                      <div className="space-y-1">
                        <div className="font-semibold mb-1">PC Komponenten</div>
                        <Link href="/kategorie/prozessoren" className="block hover:text-red-600">
                          Prozessoren
                        </Link>
                        <Link href="/kategorie/arbeitsspeicher" className="block hover:text-red-600">
                          Arbeitsspeicher (RAM)
                        </Link>
                        <Link href="/kategorie/grafikkarten" className="block hover:text-red-600">
                          Grafikkarten (GPU)
                        </Link>
                        <Link href="/kategorie/gehaeuse" className="block hover:text-red-600">
                          Gehäuse
                        </Link>
                        <Link href="/kategorie/netzteile" className="block hover:text-red-600">
                          Netzteile
                        </Link>
                      </div>

                      <div className="space-y-1">
                        <div className="font-semibold mb-1">Drucker &amp; Scanner</div>
                        <Link href="/kategorie/laserdrucker" className="block hover:text-red-600">
                          Laserdrucker
                        </Link>
                        <Link href="/kategorie/tintendrucker" className="block hover:text-red-600">
                          Tintendrucker
                        </Link>
                        <Link href="/kategorie/3d-drucker" className="block hover:text-red-600">
                          3D Drucker
                        </Link>
                        <Link href="/kategorie/scanner" className="block hover:text-red-600">
                          Scanner
                        </Link>
                        <Link href="/kategorie/druckerpatronen-toner" className="block hover:text-red-600">
                          Druckerpatronen &amp; Toner
                        </Link>
                      </div>

                      <div className="space-y-1">
                        <div className="font-semibold mb-1">PCs &amp; Monitore</div>
                        <Link href="/kategorie/tower-desktop" className="block hover:text-red-600">
                          Tower &amp; Desktop PCs
                        </Link>
                        <Link href="/kategorie/monitore" className="block hover:text-red-600">
                          Monitore
                        </Link>
                        <Link href="/kategorie/monitor-zubehoer" className="block hover:text-red-600">
                          Monitor Zubehör
                        </Link>
                      </div>

                      {/* Teaser card */}
                      <div className="col-span-2">
                        <div className="relative h-full min-h-[190px] rounded-2xl overflow-hidden bg-black text-white">
                          <img
                            src="/hero/hero-tech-sale.jpg"
                            alt="Top Deals"
                            className="absolute inset-0 h-full w-full object-cover opacity-70"
                          />
                          <div className="relative z-10 p-4 flex flex-col justify-end h-full">
                            <div className="text-xs uppercase tracking-wide mb-1 text-neutral-100">
                              Aktuelle Aktionen
                            </div>
                            <div className="text-sm font-semibold mb-1">
                              Top-Deals: Smartphones, TV, Laptops &amp; Gaming
                            </div>
                            <div className="text-[11px] text-neutral-100">
                              Täglich neue Angebote – solange Vorrat reicht.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className="inline-flex items-center h-full border-b-2 border-transparent hover:border-red-600 hover:text-red-600 transition-colors px-1"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-neutral-200 bg-white relative z-40">
          <div className="px-4 py-3 space-y-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">
                Konto &amp; Warenkorb
              </span>
              <Link
                href="/login"
                className="text-xs text-red-600 font-semibold"
              >
                Anmelden
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {mainNav.map((item) => (
                <Link
                  key={item.key}
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
