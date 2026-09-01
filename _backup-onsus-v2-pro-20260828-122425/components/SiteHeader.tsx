"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Heart,
  GitCompare,
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  Laptop,
  Monitor,
  Smartphone,
  Gamepad2,
  Wifi,
  HardDrive,
  Printer,
  House,
  ShieldCheck,
  Truck,
  Headphones,
} from "lucide-react";

import HeaderAccount from "@/components/HeaderAccount";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";

type CategoryGroup = {
  name: string;
  subcategories: string[];
};

const quickCategories = [
  { label: "Computer", href: "/produkte?category=Computer", icon: Laptop },
  {
    label: "PC-Komponenten",
    href: "/produkte?category=PC-Komponenten",
    icon: Gamepad2,
  },
  {
    label: "Monitore",
    href: "/produkte?category=Peripherie&subcategory=Monitore",
    icon: Monitor,
  },
  { label: "Mobile", href: "/produkte?category=Mobile", icon: Smartphone },
  { label: "Netzwerk", href: "/produkte?category=Netzwerk", icon: Wifi },
  {
    label: "Datenspeicher",
    href: "/produkte?category=Datenspeicher",
    icon: HardDrive,
  },
  { label: "Office", href: "/produkte?q=office", icon: Printer },
  {
    label: "Smart Home",
    href: "/produkte?category=Smart%20Home",
    icon: House,
  },
];

function categoryHref(category: string, subcategory?: string) {
  const params = new URLSearchParams();
  params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  return `/produkte?${params.toString()}`;
}

function CounterBadge({ value }: { value: number }) {
  if (value <= 0) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
      {value > 99 ? "99+" : value}
    </span>
  );
}

export default function SiteHeader() {
  const router = useRouter();
  const { totalQuantity, openDrawer } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { items: compareItems } = useCompare();

  const [query, setQuery] = useState("");
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const megaCategories = useMemo<CategoryGroup[]>(
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
          "Prozessoren",
        ],
      },
      {
        name: "Peripherie",
        subcategories: [
          "Monitore",
          "Tastaturen",
          "Mäuse",
          "Headsets",
          "Webcams",
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
        name: "Datenspeicher",
        subcategories: ["SSD & Festplatten", "NAS"],
      },
      {
        name: "Smart Home",
        subcategories: ["Kameras", "Steckdosen", "Beleuchtung"],
      },
      {
        name: "Büro & Drucker",
        subcategories: ["Drucker", "Tinte & Toner", "Papier & Etiketten"],
      },
    ],
    [],
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuery = query.trim();

    router.push(
      cleanQuery
        ? `/produkte?q=${encodeURIComponent(cleanQuery)}`
        : "/produkte",
    );

    setMobileSearchOpen(false);
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2 text-[12px] text-neutral-600 xl:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <span className="inline-flex items-center gap-1.5 font-semibold text-neutral-800">
              <Truck size={14} /> Kostenloser Standardversand ab CHF 49.–
            </span>
            <span className="hidden items-center gap-1.5 lg:inline-flex">
              <ShieldCheck size={14} /> Sichere Zahlung
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-4 font-semibold">
            <Link href="/versand" className="hover:text-red-600">
              Versand
            </Link>
            <Link href="/kontakt" className="hover:text-red-600">
              Support
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 xl:gap-5 xl:px-6 xl:py-4">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-900 transition hover:border-neutral-300 hover:bg-neutral-50 xl:hidden"
            aria-label={mobileOpen ? "Menü schliessen" : "Menü öffnen"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <Link href="/" className="shrink-0" aria-label="IUMATEC Startseite">
            <Image
              src="/logo-iumatec.svg"
              alt="IUMATEC"
              width={180}
              height={44}
              priority
              className="h-auto w-[140px] sm:w-[158px] lg:w-[172px]"
            />
          </Link>

          <div
            className="relative hidden xl:block"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <button
              type="button"
              className="flex h-12 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-extrabold text-white transition hover:bg-neutral-800"
              aria-expanded={megaOpen}
            >
              <Menu size={18} />
              Kategorien
              <ChevronDown size={15} className="text-white/70" />
            </button>

            {megaOpen ? (
              <div className="absolute left-0 top-full z-50 w-[1040px] pt-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
                  <div className="grid grid-cols-4 gap-x-10 gap-y-8">
                    {megaCategories.map((group) => (
                      <div key={group.name}>
                        <Link
                          href={categoryHref(group.name)}
                          className="mb-3 inline-flex text-[15px] font-black text-neutral-950 transition hover:text-red-600"
                          onClick={() => setMegaOpen(false)}
                        >
                          {group.name}
                        </Link>

                        <ul className="space-y-2.5">
                          {group.subcategories.map((subcategory) => (
                            <li key={subcategory}>
                              <Link
                                href={categoryHref(group.name, subcategory)}
                                className="text-sm text-neutral-600 transition hover:text-red-600"
                                onClick={() => setMegaOpen(false)}
                              >
                                {subcategory}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 flex items-center justify-between rounded-xl bg-neutral-50 px-5 py-4">
                    <div>
                      <div className="text-sm font-black text-neutral-950">
                        Das gesamte IUMATEC Sortiment
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        Technik, Zubehör und Business-Lösungen für die Schweiz.
                      </div>
                    </div>
                    <Link
                      href="/produkte"
                      className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
                      onClick={() => setMegaOpen(false)}
                    >
                      Alle Produkte →
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 md:block">
            <div className="flex h-12 overflow-hidden rounded-xl border border-neutral-300 bg-neutral-50 transition focus-within:border-red-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Produkte, Marken oder Artikelnummer suchen …"
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
                aria-label="Produkte suchen"
              />

              <button
                type="submit"
                className="flex w-12 shrink-0 items-center justify-center text-neutral-900 transition hover:bg-neutral-100 hover:text-red-600"
                aria-label="Suche starten"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-900 transition hover:bg-neutral-100 md:hidden"
              aria-label="Suche öffnen"
            >
              <Search size={21} />
            </button>

            <div className="hidden lg:block">
              <HeaderAccount />
            </div>

            <Link
              href="/merken"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-900 transition hover:bg-neutral-100"
              aria-label="Merkliste"
            >
              <Heart size={21} strokeWidth={1.9} />
              <CounterBadge value={wishlistItems.length} />
            </Link>

            <Link
              href="/compare"
              className="relative hidden h-11 w-11 items-center justify-center rounded-full text-neutral-900 transition hover:bg-neutral-100 sm:inline-flex"
              aria-label="Produkte vergleichen"
            >
              <GitCompare size={21} strokeWidth={1.9} />
              <CounterBadge value={compareItems.length} />
            </Link>

            <button
              type="button"
              onClick={openDrawer}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-950 text-white transition hover:bg-red-600"
              aria-label="Warenkorb öffnen"
            >
              <ShoppingCart size={20} strokeWidth={1.9} />
              <CounterBadge value={totalQuantity} />
            </button>
          </div>
        </div>
      </div>

      {mobileSearchOpen ? (
        <div className="border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <form onSubmit={submitSearch}>
            <div className="flex h-12 overflow-hidden rounded-xl border border-neutral-300 bg-neutral-50 focus-within:border-red-500">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Produkte suchen …"
                className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="flex w-14 items-center justify-center bg-red-600 text-white"
                aria-label="Suche starten"
              >
                <Search size={20} />
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="hidden border-b border-neutral-200 bg-white xl:block">
        <nav
          className="mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto px-6 py-2"
          aria-label="Hauptkategorien"
        >
          {quickCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.href}
                href={category.href}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-100 hover:text-red-600"
              >
                <Icon size={16} strokeWidth={1.9} />
                {category.label}
              </Link>
            );
          })}

          <Link
            href="/produkte?sort=price-asc"
            className="ml-auto inline-flex shrink-0 items-center rounded-lg bg-red-50 px-4 py-2 text-[13px] font-black text-red-700 transition hover:bg-red-100"
          >
            Aktionen
          </Link>
        </nav>
      </div>

      {mobileOpen ? (
        <div className="border-b border-neutral-200 bg-white px-4 py-4 shadow-xl xl:hidden">
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/produkte"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between rounded-xl bg-neutral-950 px-4 py-3 font-black text-white"
            >
              Alle Produkte <span>→</span>
            </Link>
            <Link
              href="/produkte?sort=price-asc"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between rounded-xl bg-red-600 px-4 py-3 font-black text-white"
            >
              Aktionen <span>→</span>
            </Link>
          </div>

          <nav className="mt-3 grid gap-2 sm:grid-cols-2">
            {quickCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.href}
                  href={category.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-50"
                >
                  <Icon size={18} />
                  {category.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 grid gap-2 border-t border-neutral-200 pt-4 sm:grid-cols-3">
            <Link
              href="/konto"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Mein Konto
            </Link>
            <Link
              href="/compare"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Vergleichen
            </Link>
            <Link
              href="/kontakt"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Kontakt
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-600">
            <Headphones size={16} /> Support für deine Bestellung und Produkte.
          </div>
        </div>
      ) : null}
    </header>
  );
}
