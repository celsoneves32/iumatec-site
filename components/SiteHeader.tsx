// components/SiteHeader.tsx
import Link from "next/link";

const ACCOUNT_URL =
  process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

export default function SiteHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          IUMATEC
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/products" className="hover:underline">
            Alle Produkte
          </Link>
          <Link href="/collections" className="hover:underline">
            Kategorien
          </Link>

          {ACCOUNT_URL && (
            <a
              href={ACCOUNT_URL}
              className="hover:underline"
              target="_self"
            >
              Mein Konto
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
