import Link from "next/link";
import CartStatus from "./CartStatus";

export default function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/logo-iumatec.svg"
            alt="IUMATEC"
            className="h-7 w-auto"
          />
        </Link>

        {/* Navegação principal */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-red-600">
            Startseite
          </Link>
          <Link href="/produkte" className="hover:text-red-600">
            Produkte
          </Link>
          <Link href="/kontakt" className="hover:text-red-600">
            Kontakt
          </Link>
          <Link href="/impressum" className="hover:text-red-600">
            Impressum
          </Link>
        </nav>

        {/* ✅ Status do carrinho */}
        <CartStatus />
      </div>
    </header>
  );
}
