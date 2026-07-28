"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
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
} from "lucide-react";

import HeaderAccount from "@/components/HeaderAccount";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";

type Props = {
  onOpenCart: () => void;
};

const categories = [
  { label: "Computer", href: "/produkte?category=Computer", icon: Laptop },
  {
    label: "Monitore",
    href: "/produkte?category=Peripherie&subcategory=Monitore",
    icon: Monitor,
  },
  { label: "Gaming", href: "/produkte?q=gaming", icon: Gamepad2 },
  { label: "Mobile", href: "/produkte?category=Mobile", icon: Smartphone },
  { label: "Netzwerk", href: "/produkte?category=Netzwerk", icon: Wifi },
  {
    label: "Speicher",
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

function CounterBadge({
  value,
  tone = "red",
}: {
  value: number;
  tone?: "red" | "black";
}) {
  if (value <= 0) return null;

  return (
    <span
      className={`absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black text-white ${
        tone === "red" ? "bg-red-600" : "bg-neutral-950"
      }`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

export default function Header({ onOpenCart }: Props) {
  const router = useRouter();
  const { totalQuantity } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { items: compareItems } = useCompare();

  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuery = query.trim();

    router.push(
      cleanQuery ? `/produkte?q=${encodeURIComponent(cleanQuery)}` : "/produkte",
    );

    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs">
          <div className="flex items-center gap-4 text-white/80">
            <span className="font-bold text-white">🇨🇭 Schweizer Tech-Shop</span>
            <span className="hidden sm:inline">Lieferung in der Schweiz</span>
            <span className="hidden lg:inline">MWST inklusive</span>
          </div>

          <div className="flex items-center gap-4 font-semibold text-white/80">
            <Link href="/angebote" className="transition hover:text-white">
              Angebote
            </Link>
            <Link
              href="/versand"
              className="hidden transition hover:text-white sm:inline"
            >
              Versand
            </Link>
            <Link
              href="/kontakt"
              className="hidden transition hover:text-white sm:inline"
            >
              Support
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-5 lg:py-4">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-900 transition hover:bg-neutral-50 lg:hidden"
          aria-label={mobileMenuOpen ? "Menü schliessen" : "Menü öffnen"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="shrink-0" aria-label="IUMATEC Startseite">
          <Image
            src="/iumatec-logo.png"
            alt="IUMATEC"
            width={180}
            height={44}
            priority
            className="h-auto w-[145px] sm:w-[165px] lg:w-[180px]"
          />
        </Link>

        <Link
          href="/produkte"
          className="hidden h-12 shrink-0 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-black text-white transition hover:bg-neutral-800 xl:flex"
        >
          <Menu size={18} />
          Kategorien
          <ChevronDown size={16} className="text-white/60" />
        </Link>

        <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 md:block">
          <div className="flex h-12 overflow-hidden rounded-xl border-2 border-neutral-950 bg-white transition focus-within:border-red-600">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Über 200'000 Produkte durchsuchen..."
              className="min-w-0 flex-1 px-5 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
              aria-label="Produkte suchen"
            />
            <button
              type="submit"
              className="flex w-14 shrink-0 items-center justify-center bg-red-600 text-white transition hover:bg-red-700"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-neutral-900 transition hover:bg-neutral-100 md:hidden"
            aria-label="Suche öffnen"
          >
            <Search size={22} />
          </button>

          <div className="hidden sm:block">
            <HeaderAccount />
          </div>

          <Link
            href="/merken"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-neutral-900 transition hover:bg-neutral-100"
            aria-label="Merkliste"
          >
            <Heart size={22} />
            <CounterBadge value={wishlistItems.length} tone="red" />
          </Link>

          <Link
            href="/compare"
            className="relative hidden h-11 w-11 items-center justify-center rounded-xl text-neutral-900 transition hover:bg-neutral-100 sm:inline-flex"
            aria-label="Produkte vergleichen"
          >
            <GitCompare size={22} />
            <CounterBadge value={compareItems.length} tone="black" />
          </Link>

          <button
            type="button"
            onClick={onOpenCart}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-800"
            aria-label="Warenkorb öffnen"
          >
            <ShoppingCart size={22} />
            <CounterBadge value={totalQuantity} tone="red" />
          </button>
        </div>
      </div>

      {mobileSearchOpen ? (
        <div className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
          <form onSubmit={submitSearch}>
            <div className="flex h-12 overflow-hidden rounded-xl border-2 border-neutral-950">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Produkte suchen..."
                className="min-w-0 flex-1 px-4 text-sm outline-none"
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

      <div className="hidden border-t border-neutral-200 bg-white lg:block">
        <nav
          className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2"
          aria-label="Hauptkategorien"
        >
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                key={category.href}
                href={category.href}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
              >
                <Icon size={17} />
                {category.label}
              </Link>
            );
          })}

          <Link
            href="/angebote"
            className="ml-auto inline-flex shrink-0 items-center rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100"
          >
            Aktionen
          </Link>
        </nav>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 shadow-xl lg:hidden">
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/produkte"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-xl bg-neutral-950 px-4 py-3 font-black text-white"
            >
              Alle Produkte
              <span>→</span>
            </Link>

            <Link
              href="/angebote"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between rounded-xl bg-red-600 px-4 py-3 font-black text-white"
            >
              Angebote
              <span>→</span>
            </Link>
          </div>

          <nav className="mt-3 grid gap-2 sm:grid-cols-2">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <Link
                  key={category.href}
                  href={category.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 font-bold text-neutral-800 transition hover:bg-neutral-50"
                >
                  <Icon size={19} />
                  {category.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 grid gap-2 border-t border-neutral-200 pt-4 sm:grid-cols-3">
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Mein Konto
            </Link>
            <Link
              href="/compare"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Vergleichen
            </Link>
            <Link
              href="/kontakt"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              Kontakt
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}