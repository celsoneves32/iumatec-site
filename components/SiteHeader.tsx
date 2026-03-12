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

function SectionIcon({ title }: { title: string }) {
  const cls = "h-4 w-4 text-brand";

  switch (title) {
    case "Computer":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls}>
          <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 20h8M10 16v4M14 16v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "PC-Komponenten":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls}>
          <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "Peripherie":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls}>
          <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h8M16 13h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "Netzwerk":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls}>
          <rect x="4" y="11" width="16" height="6" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 8a6 6 0 0 1 8 0M10 6a3.5 3.5 0 0 1 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "Mobile":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls}>
          <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M11 6h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "Office & Business":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls}>
          <rect x="6" y="4" width="12" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="4" y="10" width="16" height="7" rx="2" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "Datenspeicher":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls}>
          <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M9 8h6M9 12h6M9 16h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "Smart Home":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls}>
          <path d="M12 3a5 5 0 0 1 5 5c0 2-1.1 3.2-2 4.2-.8.9-1.5 1.7-1.5 2.8h-3c0-1.1-.7-1.9-1.5-2.8C8.1 11.2 7 10 7 8a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M10 18h4M10.5 21h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={cls}>
          <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
  }
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
          className="pointer-events-none opacity-0 translate-y-2
                     group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto
                     transition absolute left-1/2 top-full z-50 w-[1040px] -translate-x-1/2 pt-3"
        >
          <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl p-6">
            <div className="grid grid-cols-4 gap-x-8 gap-y-8">
              {megaMenu.map((group) => (
                <div key={group.title}>
                  <div className="mb-3">
                    <Link
                      href={group.href || "/collections"}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-brand"
                    >
                      <SectionIcon title={group.title} />
                      <span>{group.title}</span>
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

            <div className="mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-4 flex items-center justify-between gap-6">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Entdecke alle Kategorien und finde schnell die passende Technik.
              </p>
              <Link
                href="/collections"
                className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition"
              >
                Alle Kategorien
              </Link>
            </div>
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

function MobileMenuDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 xl:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 z-[61] w-[88%] max-w-[380px] overflow-y-auto border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl xl:hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
          <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Kategorien
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            Schliessen
          </button>
        </div>

        <div className="px-4 py-5 space-y-6">
          <Link
            href="/products"
            onClick={onClose}
            className="block rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            Alle Produkte
          </Link>

          <Link
            href="/collections"
            onClick={onClose}
            className="block rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark transition"
          >
            Alle Kategorien ansehen
          </Link>

          {megaMenu.map((group) => (
            <div key={group.title} className="border-b border-neutral-200 dark:border-neutral-800 pb-5 last:border-b-0">
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                <SectionIcon title={group.title} />
                <span>{group.title}</span>
              </div>

              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="block text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand transition"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {ACCOUNT_URL && (
            <a
              href={ACCOUNT_URL}
              className="block rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              Mein Konto
            </a>
          )}
        </div>
      </div>
    </>
  );
}

export default function SiteHeader() {
  const { cart, totalQuantity, goToCheckout } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <>
      <header
        className={[
          "sticky top-0 z-50 border-b border-neutral-200 bg-white/85 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85",
          scrolled ? "shadow-sm" : "",
        ].join(" ")}
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex xl:hidden items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                aria-label="Menü öffnen"
              >
                ☰
              </button>

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
            </div>

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

      <MobileMenuDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
