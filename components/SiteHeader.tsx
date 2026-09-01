"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgePercent,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  GitCompare,
  HardDrive,
  Heart,
  House,
  Laptop,
  Menu,
  Monitor,
  PackageSearch,
  Printer,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Truck,
  UserRound,
  Wifi,
  X,
} from "lucide-react";

import HeaderAccount from "@/components/HeaderAccount";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";

type CategoryLink = {
  label: string;
  href: string;
};

type CategoryGroup = {
  name: string;
  href: string;
  items: CategoryLink[];
};

const quickCategories = [
  { label: "Computer", href: "/produkte?category=Computer", icon: Laptop },
  {
    label: "PC-Komponenten",
    href: "/produkte?category=PC-Komponenten",
    icon: Gamepad2,
  },
  {
    label: "Peripherie",
    href: "/produkte?category=Peripherie",
    icon: Monitor,
  },
  { label: "Netzwerk", href: "/produkte?category=Netzwerk", icon: Wifi },
  { label: "Mobile", href: "/produkte?category=Mobile", icon: Smartphone },
  {
    label: "Office & Business",
    href: "/produkte?category=Office%20%26%20Business",
    icon: Printer,
  },
  {
    label: "Datenspeicher",
    href: "/produkte?category=Datenspeicher",
    icon: HardDrive,
  },
  {
    label: "Smart Home",
    href: "/produkte?category=Smart%20Home",
    icon: House,
  },
];

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: "Computer",
    href: "/produkte?category=Computer",
    items: [
      { label: "Laptops", href: "/produkte?category=Computer&subcategory=Laptops" },
      { label: "Desktop-PCs", href: "/produkte?category=Computer&subcategory=Desktop-PCs" },
      { label: "Mini PCs", href: "/produkte?category=Computer&subcategory=Mini%20PCs" },
      { label: "Computer-Zubehör", href: "/produkte?category=Computer&subcategory=Computer-Zubeh%C3%B6r" },
    ],
  },
  {
    name: "PC-Komponenten",
    href: "/produkte?category=PC-Komponenten",
    items: [
      { label: "Komponenten", href: "/produkte?category=PC-Komponenten&subcategory=Komponenten" },
      { label: "Kabel & Adapter", href: "/produkte?category=PC-Komponenten&subcategory=Kabel%20%26%20Adapter" },
      { label: "Gaming-Komponenten", href: "/produkte?category=PC-Komponenten&subcategory=Gaming-Komponenten" },
      { label: "Grafikkarten", href: "/produkte?category=PC-Komponenten&q=Grafikkarte" },
      { label: "Prozessoren", href: "/produkte?category=PC-Komponenten&q=Prozessor" },
    ],
  },
  {
    name: "Peripherie",
    href: "/produkte?category=Peripherie",
    items: [
      { label: "Monitore", href: "/produkte?category=Peripherie&subcategory=Monitore" },
      { label: "Tastaturen", href: "/produkte?category=Peripherie&subcategory=Tastaturen" },
      { label: "Mäuse", href: "/produkte?category=Peripherie&subcategory=M%C3%A4use" },
      { label: "Headsets", href: "/produkte?category=Peripherie&subcategory=Headsets" },
      { label: "Webcams", href: "/produkte?category=Peripherie&subcategory=Webcams" },
      { label: "Dockingstationen", href: "/produkte?category=Peripherie&subcategory=Dockingstationen" },
      { label: "Foto & Video", href: "/produkte?category=Peripherie&subcategory=Foto%20%26%20Video" },
    ],
  },
  {
    name: "Netzwerk",
    href: "/produkte?category=Netzwerk",
    items: [
      { label: "Netzwerk", href: "/produkte?category=Netzwerk&subcategory=Netzwerk" },
      { label: "Kabel & Adapter", href: "/produkte?category=Netzwerk&subcategory=Kabel%20%26%20Adapter" },
      { label: "Server", href: "/produkte?category=Netzwerk&subcategory=Server" },
      { label: "IT-Sicherheit", href: "/produkte?category=Netzwerk&subcategory=IT-Sicherheit" },
    ],
  },
  {
    name: "Mobile",
    href: "/produkte?category=Mobile",
    items: [
      { label: "Smartphones", href: "/produkte?category=Mobile&subcategory=Smartphones" },
      { label: "Tablets", href: "/produkte?category=Mobile&subcategory=Tablets" },
      { label: "Mobile Zubehör", href: "/produkte?category=Mobile&subcategory=Mobile%20Zubeh%C3%B6r" },
    ],
  },
  {
    name: "Office & Business",
    href: "/produkte?category=Office%20%26%20Business",
    items: [
      { label: "Drucker & Scanner", href: "/produkte?category=Office%20%26%20Business&subcategory=Drucker%20%26%20Scanner" },
      { label: "Telefonie", href: "/produkte?category=Office%20%26%20Business&subcategory=Telefonie" },
      { label: "Software", href: "/produkte?category=Office%20%26%20Business&subcategory=Software" },
      { label: "Projektoren", href: "/produkte?category=Office%20%26%20Business&subcategory=Projektoren" },
      { label: "Professional AV", href: "/produkte?category=Office%20%26%20Business&subcategory=Professional%20AV" },
    ],
  },
  {
    name: "Datenspeicher",
    href: "/produkte?category=Datenspeicher",
    items: [
      { label: "Storage", href: "/produkte?category=Datenspeicher&subcategory=Storage" },
      { label: "SSD", href: "/produkte?category=Datenspeicher&q=SSD" },
      { label: "HDD", href: "/produkte?category=Datenspeicher&q=HDD" },
      { label: "NAS", href: "/produkte?category=Datenspeicher&q=NAS" },
    ],
  },
  {
    name: "Smart Home",
    href: "/produkte?category=Smart%20Home",
    items: [
      { label: "Beleuchtung", href: "/produkte?category=Smart%20Home&subcategory=Beleuchtung" },
      { label: "Gebäudetechnik", href: "/produkte?category=Smart%20Home&subcategory=Geb%C3%A4udetechnik" },
      { label: "Energie & Strom", href: "/produkte?category=Smart%20Home&subcategory=Energie%20%26%20Strom" },
      { label: "Sicherheit", href: "/produkte?category=Smart%20Home&subcategory=Sicherheit" },
      { label: "Sicherheit & Überwachung", href: "/produkte?category=Smart%20Home&subcategory=Sicherheit%20%26%20%C3%9Cberwachung" },
    ],
  },
];

function CounterBadge({ value, dark = false }: { value: number; dark?: boolean }) {
  if (value <= 0) return null;

  return (
    <span
      className={`absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[9px] font-black leading-none ring-2 ${
        dark
          ? "bg-white text-neutral-950 ring-neutral-950"
          : "bg-red-600 text-white ring-white"
      }`}
    >
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
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(15,23,42,0.06)]">
      <div className="bg-neutral-950 text-white">
        <div className="mx-auto flex min-h-[34px] max-w-[1440px] items-center justify-between gap-4 px-4 text-[11px] xl:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <span className="inline-flex items-center gap-1.5 font-bold text-white/90">
              <Truck size={13} />
              Standardversand ab CHF 49.– gratis
            </span>
            <span className="hidden items-center gap-1.5 text-white/60 lg:inline-flex">
              <ShieldCheck size={13} />
              Sicherer Checkout
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-4 font-semibold text-white/70">
            <Link href="/versand" className="transition hover:text-white">
              Versand
            </Link>
            <Link href="/kontakt" className="transition hover:text-white">
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
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-900 transition hover:border-neutral-300 hover:bg-neutral-50 xl:hidden"
            aria-label={mobileOpen ? "Menü schliessen" : "Menü öffnen"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <Link
            href="/"
            className="shrink-0 rounded-xl outline-none"
            aria-label="IUMATEC Startseite"
          >
            <Image
              src="/logo-iumatec.svg"
              alt="IUMATEC"
              width={188}
              height={46}
              priority
              className="h-auto w-[142px] sm:w-[160px] lg:w-[176px]"
            />
          </Link>

          <div
            className="relative hidden xl:block"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <button
              type="button"
              className="flex h-[50px] items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700"
              aria-expanded={megaOpen}
            >
              <Menu size={18} />
              Kategorien
              <ChevronDown size={15} className="text-white/70" />
            </button>

            {megaOpen ? (
              <div className="absolute left-0 top-full z-50 w-[1060px] pt-3">
                <div className="overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.17)]">
                  <div className="grid grid-cols-[1fr_260px]">
                    <div className="grid grid-cols-4 gap-x-9 gap-y-8 p-7">
                      {CATEGORY_GROUPS.map((group) => (
                        <div key={group.name}>
                          <Link
                            href={group.href}
                            className="mb-3 inline-flex items-center gap-1.5 text-[14px] font-black text-neutral-950 transition hover:text-red-600"
                            onClick={() => setMegaOpen(false)}
                          >
                            {group.name}
                            <ChevronRight size={13} />
                          </Link>

                          <ul className="space-y-2.5">
                            {group.items.map((item) => (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  className="text-[13px] leading-5 text-neutral-600 transition hover:text-red-600"
                                  onClick={() => setMegaOpen(false)}
                                >
                                  {item.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col justify-between bg-neutral-950 p-6 text-white">
                      <div>
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                          <PackageSearch size={22} />
                        </div>
                        <div className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-red-400">
                          IUMATEC Sortiment
                        </div>
                        <div className="mt-2 text-2xl font-black leading-tight tracking-tight">
                          Technik für Privat & Business
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white/60">
                          Computer, Mobile, Netzwerk, Smart Home und Zubehör für die Schweiz.
                        </p>
                      </div>

                      <Link
                        href="/produkte"
                        className="mt-6 inline-flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-black text-neutral-950 transition hover:bg-red-600 hover:text-white"
                        onClick={() => setMegaOpen(false)}
                      >
                        Alle Produkte
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 md:block">
            <div className="flex h-[50px] overflow-hidden rounded-xl border border-neutral-300 bg-neutral-50 transition focus-within:border-red-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-50">
              <div className="hidden items-center border-r border-neutral-200 px-4 text-[11px] font-black text-neutral-500 lg:flex">
                Alle Produkte
              </div>

              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Produkte, Marken oder Artikelnummer suchen …"
                className="min-w-0 flex-1 bg-transparent px-4 text-sm font-medium text-neutral-950 outline-none placeholder:text-neutral-400"
                aria-label="Produkte suchen"
              />

              <button
                type="submit"
                className="flex w-[54px] shrink-0 items-center justify-center bg-neutral-950 text-white transition hover:bg-red-600"
                aria-label="Suche starten"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1 lg:gap-2">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-neutral-900 transition hover:bg-neutral-100 md:hidden"
              aria-label="Suche öffnen"
            >
              <Search size={21} />
            </button>

            <div className="hidden xl:block">
              <HeaderAccount />
            </div>

            <Link
              href="/merken"
              className="group relative hidden min-w-[48px] items-center gap-2 rounded-xl px-2 py-2 text-neutral-900 transition hover:bg-neutral-100 sm:inline-flex"
              aria-label="Merkliste"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center">
                <Heart size={20} strokeWidth={1.9} />
                <CounterBadge value={wishlistItems.length} />
              </span>
              <span className="hidden pr-1 2xl:block">
                <span className="block text-[10px] font-semibold text-neutral-400">
                  Liste
                </span>
                <span className="block text-xs font-black">Merken</span>
              </span>
            </Link>

            <Link
              href="/compare"
              className="group relative hidden min-w-[48px] items-center gap-2 rounded-xl px-2 py-2 text-neutral-900 transition hover:bg-neutral-100 lg:inline-flex"
              aria-label="Produkte vergleichen"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center">
                <GitCompare size={20} strokeWidth={1.9} />
                <CounterBadge value={compareItems.length} />
              </span>
              <span className="hidden pr-1 2xl:block">
                <span className="block text-[10px] font-semibold text-neutral-400">
                  Produkte
                </span>
                <span className="block text-xs font-black">Vergleichen</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={openDrawer}
              className="group relative inline-flex min-w-[48px] items-center gap-2 rounded-xl bg-neutral-950 px-2 py-2 text-white transition hover:bg-red-600"
              aria-label="Warenkorb öffnen"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center">
                <ShoppingCart size={19} strokeWidth={1.9} />
                <CounterBadge value={totalQuantity} dark />
              </span>
              <span className="hidden pr-2 2xl:block">
                <span className="block text-[10px] font-semibold text-white/55">
                  Warenkorb
                </span>
                <span className="block text-xs font-black">Öffnen</span>
              </span>
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
                className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-black text-neutral-700 transition hover:bg-neutral-100 hover:text-red-600"
              >
                <Icon size={15} strokeWidth={1.9} />
                {category.label}
              </Link>
            );
          })}

          <Link
            href="/produkte?sort=price-asc"
            className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-[12px] font-black text-red-700 transition hover:bg-red-100"
          >
            <BadgePercent size={15} />
            Angebote
          </Link>
        </nav>
      </div>

      {mobileOpen ? (
        <div className="border-b border-neutral-200 bg-white px-4 py-4 shadow-[0_20px_50px_rgba(15,23,42,.12)] xl:hidden">
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/produkte"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between rounded-xl bg-neutral-950 px-4 py-3 font-black text-white"
            >
              Alle Produkte <ChevronRight size={16} />
            </Link>
            <Link
              href="/produkte?sort=price-asc"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between rounded-xl bg-red-600 px-4 py-3 font-black text-white"
            >
              Angebote <BadgePercent size={16} />
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
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              <UserRound size={16} />
              Mein Konto
            </Link>
            <Link
              href="/compare"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              <GitCompare size={16} />
              Vergleichen
            </Link>
            <Link
              href="/kontakt"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              <ShieldCheck size={16} />
              Support
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
