"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, Heart, GitCompare, ShoppingCart, Menu } from "lucide-react";

import HeaderAccount from "@/components/HeaderAccount";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";

type Props = {
  onOpenCart: () => void;
};

export default function Header({ onOpenCart }: Props) {
  const { totalQuantity } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { items: compareItems } = useCompare();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">

      {/* Top Bar */}
      <div className="border-b bg-neutral-50">
        <div className="mx-auto max-w-7xl flex justify-between items-center px-4 py-2 text-xs text-neutral-600">

          <div className="flex gap-6">
            <span>🇨🇭 Lieferung Schweiz</span>
            <span>24h Support</span>
            <span>Sicher bezahlen</span>
          </div>

          <div className="hidden md:flex gap-5">
            <Link href="/angebote">Angebote</Link>
            <Link href="/kontakt">Kontakt</Link>
            <Link href="/hilfe">Hilfe</Link>
          </div>

        </div>
      </div>

      {/* Main Header */}

      <div className="mx-auto max-w-7xl flex items-center gap-5 px-4 py-4">

        <button className="lg:hidden">
          <Menu size={24} />
        </button>

        <Link href="/">
          <Image
            src="/iumatec-logo.png"
            alt="IUMATEC"
            width={170}
            height={40}
            priority
          />
        </Link>

        {/* SEARCH */}

        <div className="flex-1 hidden md:flex">

          <div className="flex w-full overflow-hidden rounded-xl border">

            <input
              placeholder="Produkte suchen..."
              className="w-full px-5 py-3 outline-none"
            />

            <button className="bg-black text-white px-6 flex items-center justify-center hover:bg-neutral-800">
              <Search size={18} />
            </button>

          </div>

        </div>

        {/* Icons */}

        <div className="flex items-center gap-5">

          <HeaderAccount />

          <Link href="/merken" className="relative">
            <Heart size={22} />

            {wishlistItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center">
                {wishlistItems.length}
              </span>
            )}

          </Link>

          <Link href="/compare" className="relative">
            <GitCompare size={22} />

            {compareItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center">
                {compareItems.length}
              </span>
            )}

          </Link>

          <button
            onClick={onOpenCart}
            className="relative"
          >
            <ShoppingCart size={24} />

            {totalQuantity > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center">
                {totalQuantity}
              </span>
            )}

          </button>

        </div>

      </div>

      {/* Categories */}

      <div className="border-t hidden lg:block">

        <div className="mx-auto max-w-7xl flex gap-8 px-4 py-3 text-sm font-medium">

          <Link href="/produkte">Produkte</Link>

          <Link href="/collections/computer">
            Computer
          </Link>

          <Link href="/collections/pc-komponenten">
            PC-Komponenten
          </Link>

          <Link href="/collections/peripherie">
            Peripherie
          </Link>

          <Link href="/collections/mobile">
            Mobile
          </Link>

          <Link href="/collections/netzwerk">
            Netzwerk
          </Link>

          <Link href="/collections/datenspeicher">
            Speicher
          </Link>

        </div>

      </div>

    </header>
  );
}