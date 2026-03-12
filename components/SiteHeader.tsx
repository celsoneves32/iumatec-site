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
