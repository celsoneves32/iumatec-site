import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer
      className="mt-12 border-t bg-gray-50 dark:bg-neutral-900 dark:border-neutral-800"
      aria-label="Seitenende"
    >
      <div className="max-w-7xl mx-auto px-4 py-10 grid gap-10 sm:grid-cols-2 md:grid-cols-4 text-sm">
        {/* Logo & Info */}
        <div>
          <Link href="/" aria-label="Startseite IUMATEC">
            <img
              src="/logo-iumatec.svg"
              alt="IUMATEC"
              className="h-7 mb-3"
            />
          </Link>
          <p className="text-gray-600 dark:text-gray-300">
            Technik zum besten Preis – schnelle Lieferung in der Schweiz.
          </p>
          <div className="mt-4 space-y-1 text-gray-500 dark:text-gray-400">
            <div>📍 Zürich, Schweiz 🇨🇭</div>
            <div>
              ✉️{" "}
              <a href="mailto:support@iumatec.ch" className="hover:underline">
                support@iumatec.ch
              </a>
            </div>
          </div>
        </div>

        {/* Shop Kategorien */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Kategorien
          </h3>
          <ul className="space-y-1 text-gray-500 dark:text-gray-400">
            <li>
              <Link href="/produkte?cat=Smartphones" className="hover:text-brand-red">
                Smartphones
              </Link>
            </li>
            <li>
              <Link href="/produkte?cat=TV & Audio" className="hover:text-brand-red">
                TV & Audio
              </Link>
            </li>
            <li>
              <Link href="/produkte?cat=Informatik" className="hover:text-brand-red">
                Informatik
              </Link>
            </li>
            <li>
              <Link href="/produkte?cat=Gaming" className="hover:text-brand-red">
                Gaming
              </Link>
            </li>
          </ul>
        </div>

        {/* Hilfe & Support */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Hilfe & Support
          </h3>
          <ul className="space-y-1 text-gray-500 dark:text-gray-400">
            <li>
              <Link href="/kontakt" className="hover:text-brand-red">
                Kontakt
              </Link>
            </li>
            <li>
              <Link href="/ueber-uns" className="hover:text-brand-red">
                Über uns
              </Link>
            </li>
            <li>
              <Link href="/datenschutz" className="hover:text-brand-red">
                Datenschutz
              </Link>
            </li>
            <li>
              <Link href="/agb" className="hover:text-brand-red">
                AGB
              </Link>
            </li>
          </ul>
        </div>

        {/* Zahlung & Versand */}
        <div>
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Zahlung & Versand
          </h3>
          <ul className="space-y-1 text-gray-500 dark:text-gray-400">
            <li>💳 TWINT, Kreditkarte, PostFinance</li>
            <li>🚚 Gratis Versand ab CHF 49.–</li>
            <li>📦 Rückgabe innert 14 Tagen</li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t dark:border-neutral-800 mt-8 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} IUMATEC Schweiz – Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
