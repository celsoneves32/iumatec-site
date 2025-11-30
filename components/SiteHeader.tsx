// components/SiteHeader.tsx
import Link from "next/link";
import CartStatus from "./CartStatus";
import AccountButton from "@/components/AccountButton";
import HeaderSearch from "@/components/HeaderSearch";

export default function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
      {/* Linha 1 – logo + pesquisa + ícones */}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <img
            src="/logo-iumatec.svg"
            alt="IUMATEC"
            className="h-7 w-auto"
          />
        </Link>

        {/* Barra de pesquisa (desktop) */}
        <div className="flex-1 hidden md:block">
          <HeaderSearch />
        </div>

        {/* Ícones conta + carrinho */}
        <div className="flex items-center gap-3">
          <AccountButton />
          <CartStatus />
        </div>
      </div>

      {/* Linha 2 – menu principal */}
      <nav className="border-t border-neutral-200 bg-white/90">
        <div className="max-w-7xl mx-auto px-4 h-10 flex items-center gap-6 text-sm overflow-x-auto">
          <Link href="/" className="hover:text-red-600 whitespace-nowrap">
            Startseite
          </Link>
          <Link
            href="/produkte"
            className="hover:text-red-600 whitespace-nowrap"
          >
            Produkte
          </Link>
          <Link
            href="/kontakt"
            className="hover:text-red-600 whitespace-nowrap"
          >
            Kontakt
          </Link>
          <Link
            href="/impressum"
            className="hover:text-red-600 whitespace-nowrap"
          >
            Impressum
          </Link>
        </div>
      </nav>
    </header>
  );
}
