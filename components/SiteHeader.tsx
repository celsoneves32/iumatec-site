"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

type MegaMenuGroup = {
  title: string;
  href?: string;
  items: { label: string; href: string }[];
};

const megaMenu: MegaMenuGroup[] = [
  {
    title: "Computer",
    href: "/collections",
    items: [
      { label: "Laptops", href: "/collections/laptops" },
      { label: "Desktop-PCs", href: "/collections/desktop-pcs" },
      { label: "Mini PCs", href: "/collections/mini-pcs" },
    ],
  },
  {
    title: "PC-Komponenten",
    href: "/collections",
    items: [
      { label: "Grafikkarten", href: "/collections/gpus" },
      { label: "Arbeitsspeicher (RAM)", href: "/collections/ram" },
      { label: "Mainboards", href: "/collections/mainboards" },
      { label: "Netzteile", href: "/collections/netzteile" },
    ],
  },
  {
    title: "Peripherie",
    href: "/collections",
    items: [
      { label: "Tastaturen", href: "/collections/tastaturen" },
      { label: "Monitors", href: "/collections/monitors" },
      { label: "Mäuse", href: "/collections/mice" },
      { label: "Headsets", href: "/collections/headsets" },
      { label: "Webcams", href: "/collections/webcams" },
      { label: "Gaming-Stühle", href: "/collections/gaming-chairs" },
      { label: "Dockingstationen", href: "/collections/docking-stations" },
    ],
  },
  {
    title: "Netzwerk",
    href: "/collections",
    items: [
      { label: "Router", href: "/collections/routers" },
      { label: "Netzwerk-Switches", href: "/collections/switches" },
      { label: "WLAN Mesh", href: "/collections/wlan-mesh" },
    ],
  },
  {
    title: "Mobile",
    href: "/collections",
    items: [
      { label: "Smartphones", href: "/collections/smartphones" },
      { label: "Tablets", href: "/collections/tablets" },
      { label: "Zubehör", href: "/collections/accessories" },
    ],
  },
  {
    title: "Office & Business",
    href: "/collections",
    items: [{ label: "Drucker", href: "/collections/printers" }],
  },
  {
    title: "Datenspeicher",
    href: "/collections",
    items: [
      { label: "Externe SSD", href: "/collections/external-ssd" },
      { label: "NAS", href: "/collections/nas" },
    ],
  },
  {
    title: "Smart Home",
    href: "/collections",
    items: [
      { label: "Kameras", href: "/collections/cameras" },
      { label: "Smarte Steckdosen", href: "/collections/smart-plugs" },
      { label: "Smarte Beleuchtung", href: "/collections/smart-lighting" },
    ],
  },
];

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
      className="relative text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition
                 after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
                 after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                 hover:after:scale-x-100"
    >
      {children}
    </Link>
  );
}

function MegaMenuDesktop() {
  return (
    <div className="hidden xl:flex items-center gap-6">
      <div className="relative group">
        <button
          type="button"
          className="relative text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition
                     after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
                     after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                     group-hover:after:scale-x-100"
        >
          Kategorien
        </button>

        <div
          className="pointer-events-none opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0
                     group-hover:pointer-events-auto transition absolute left-1/2 top-full z-50 mt-4 w-[980px] -translate-x-1/2
                     rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl p-6"
        >
          <div className="grid grid-cols-4 gap-6">
            {megaMenu.map((group) => (
              <div key={group.title}>
                <div className="mb-3">
                  <Link
                    href={group.href || "/collections"}
                    className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-brand"
                  >
                    {group.title}
                  </Link>
                </div>

                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand transition"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-4 flex items-center justify-between">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Entdecke alle Kategorien und finde schnell die passende Technik.
            </p>
            <Link
              href="/collections"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition"
            >
              Alle Kategorien
            </Link>
          </div>
        </div>
      </div>

      <NavLink href="/products">Alle Produkte</NavLink>

      {ACCOUNT_URL && (
        <a
          href={ACCOUNT_URL}
          target="_self"
          className="relative text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition
                     after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full
                     after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-200
                     hover:after:scale-x-100"
        >
          Mein Konto
        </a>
      )}
    </div>
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

          <MegaMenuDesktop />

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

          <div className="flex items-center gap-3">
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

            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="inline-flex lg:hidden items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              aria-label="Suche öffnen"
            >
              <span className="text-base">🔍</span>
            </button>

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

            <Link
              href="/products"
              className="hidden sm:inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition"
            >
              Shop
            </Link>
          </div>
        </div>

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
