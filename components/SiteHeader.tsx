import Link from "next/link";
import HeaderActions from "@/components/HeaderActions";

const ACCOUNT_URL = process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        {/* Brand */}
        <Link href="/" className="font-semibold tracking-tight">
          IUMATEC
        </Link>

        {/* Desktop nav */}
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

        {/* Actions (cart badge + drawer + mobile menu) */}
        <HeaderActions accountUrl={ACCOUNT_URL || undefined} />
      </div>
    </header>
  );
}
