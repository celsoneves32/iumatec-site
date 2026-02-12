"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";

export default function HeaderActions({ accountUrl }: { accountUrl?: string }) {
  const { totalQuantity, loading } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const badge = useMemo(() => {
    if (totalQuantity <= 0) return null;
    return (
      <span
        className={[
          "absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full",
          "bg-black text-white text-[11px] flex items-center justify-center px-1",
          loading ? "opacity-60" : "opacity-100",
        ].join(" ")}
      >
        {totalQuantity}
      </span>
    );
  }, [totalQuantity, loading]);

  return (
    <>
      {/* Right actions (desktop + mobile) */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <Link
          href="/search"
          className="hidden sm:inline-flex items-center rounded-xl border px-3 py-2 hover:bg-neutral-50 transition"
          title="Suche"
          aria-label="Suche"
        >
          🔎
        </Link>

        {/* Account */}
        {accountUrl ? (
          <a
            href={accountUrl}
            target="_self"
            className="hidden sm:inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 transition"
          >
            Mein Konto
          </a>
        ) : null}

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative inline-flex items-center justify-center rounded-xl border px-3 py-2 hover:bg-neutral-50 transition"
          aria-label="Warenkorb öffnen"
          title="Warenkorb"
        >
          🛒
          {badge}
        </button>

        {/* Mobile menu */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex md:hidden items-center justify-center rounded-xl border px-3 py-2 hover:bg-neutral-50 transition"
          aria-label="Menü"
          title="Menü"
        >
          ☰
        </button>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 text-sm">
            <Link href="/products" onClick={() => setMenuOpen(false)} className="hover:underline">
              Alle Produkte
            </Link>
            <Link href="/collections" onClick={() => setMenuOpen(false)} className="hover:underline">
              Kategorien
            </Link>
            <Link href="/aktionen" onClick={() => setMenuOpen(false)} className="hover:underline">
              Aktionen
            </Link>
            <Link href="/search" onClick={() => setMenuOpen(false)} className="hover:underline">
              Suche
            </Link>

            {accountUrl ? (
              <a href={accountUrl} target="_self" className="hover:underline">
                Mein Konto
              </a>
            ) : null}
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
