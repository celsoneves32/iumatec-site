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
          className="relative text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition"
        >
          Kategorien
        </button>

        <div className="pointer-events-none opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition absolute left-1/2 top-full z-50 w-[980px] -translate-x-1/2 pt-3">
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

            <div className="mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-4 flex justify-end">
              <Link
                href="/collections"
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition"
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
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
        >
          Mein Konto
        </a>
      )}
    </div>
  );
}

export default function SiteHeader() {
  const { cart, totalQuantity } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">

          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-iumatec.svg"
              alt="IUMATEC"
              width={140}
              height={32}
              className="h-7 w-auto"
            />
          </Link>

          <MegaMenuDesktop />

          <Link
            href="/cart"
            className="relative inline-flex items-center justify-center rounded-full border px-3 py-2"
          >
            🛒
            {totalQuantity > 0 && (
              <span className="absolute -right-2 -top-2 bg-brand text-white text-xs rounded-full px-1">
                {totalQuantity}
              </span>
            )}
          </Link>

        </div>
      </div>
    </header>
  );
}
