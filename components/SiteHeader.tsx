import Link from "next/link";
import HeaderCartButton from "@/components/HeaderCartButton";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        {/* Left: Brand */}
        <Link href="/" className="font-semibold tracking-tight">
          IUMATEC
        </Link>

        {/* Center: Nav (desktop) */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-6 text-sm">
          <Link href="/products" className="hover:underline">
            Alle Produkte
          </Link>
          <Link href="/collections" className="hover:underline">
            Kategorien
          </Link>
          <Link href="/aktionen" className="hover:underline">
            Aktionen
          </Link>
        </nav>

        {/* Right: Account + Cart */}
        <div className="ml-auto flex items-center gap-2">
          {ACCOUNT_URL && (
            <a
              href={ACCOUNT_URL}
              className="hidden sm:inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 transition"
              target="_self"
            >
              Mein Konto
            </a>
          )}

          <HeaderCartButton />
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t">
        <div className="mx-auto max-w-6xl px-4 py-2 flex items-center gap-4 text-sm">
          <Link href="/products" className="hover:underline">
            Produkte
          </Link>
          <Link href="/collections" className="hover:underline">
            Kategorien
          </Link>
          <Link href="/aktionen" className="hover:underline">
            Aktionen
          </Link>

          {ACCOUNT_URL && (
            <a href={ACCOUNT_URL} className="ml-auto hover:underline" target="_self">
              Konto
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
