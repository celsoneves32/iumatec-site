"use client";

import Image from "next/image";
import Link from "next/link";
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
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/iumatec-logo.png"
              alt="IUMATEC"
              width={140}
              height={36}
              priority
              className="h-auto w-auto"
            />
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            <Link
              href="/produkte"
              className="text-sm font-medium text-neutral-700 transition hover:text-black"
            >
              Produkte
            </Link>

            <Link
              href="/collections"
              className="text-sm font-medium text-neutral-700 transition hover:text-black"
            >
              Kategorien
            </Link>

            <Link
              href="/angebote"
              className="text-sm font-medium text-neutral-700 transition hover:text-black"
            >
              Angebote
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <HeaderAccount />

          <Link
            href="/merken"
            className="hidden text-sm font-semibold text-neutral-700 transition hover:text-black sm:block"
          >
            Merken ({wishlistItems.length})
          </Link>

          <Link
            href="/compare"
            className="hidden text-sm font-semibold text-neutral-700 transition hover:text-black sm:block"
          >
            Vergleichen ({compareItems.length})
          </Link>

          <Link
            href="/warenkorb"
            className="hidden text-sm font-semibold text-neutral-700 transition hover:text-black sm:block"
          >
            Warenkorb
          </Link>

          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
          >
            <span>Cart</span>
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-black px-2 py-0.5 text-xs font-bold text-white">
              {totalQuantity ?? 0}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}