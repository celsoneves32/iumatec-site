import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer
      className="mt-12 border-t bg-gray-50 dark:bg-neutral-900 dark:border-neutral-800"
      aria-label="Seitenende"
    >
      <div className="max-w-7xl mx-auto px-4 py-10 grid gap-10 sm:grid-cols-2 md:grid-cols-4 text-sm">
        {/* Logo & Kontakt */}
        <div>
          <Link href="/" aria-label="Startseite IUMATEC">
            <img
              src="/logo-iumatec.svg"
              alt="IUMATEC"
              className="h-7 mb-3"
            />
          </Link>
          <p className="text-gray-600 dark:text-gray-300">
            Technik zum besten Preis – schnelle Lieferung in der ganzen Schweiz.
          </p>

          <div className="mt-4 space-y-1 text-gray-500 dark:text-gray-400">
            <div>📍 Zürich, Schweiz 🇨🇭</div>
            <div>
              ✉️{" "}
              <a
                href="mailto:info@iumatec.ch"
                className="hover:text-brand-red underline-offset-2 hover:underline"
              >
                info@iumatec.ch
              </a>
            </div>
            <div>
              🛟{" "}
              <a
                href="mailto:support@iumatec.ch"
                className="hover:text-brand-red underline-offset-2 hover:underline"
              >
                support@iumatec.ch
              </a>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Informationen
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-400">
            <li>
              <Link href="/ueber-uns" className="hover:text-brand-red">
                Über uns
              </Link>
            </li>
            <li>
              <Link href="/produkte" className="hover:text-brand-red">
                Produkte
              </Link>
            </li>
            <li>
              <Link href="/kontakt" className="hover:text-brand-red">
                Kontakt
              </Link>
            </li>
          </ul>
        </div>

        {/* Rechtliches */}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Rechtliches
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-400">
            <li>
              <Link href="/agb" className="hover:text-brand-red">
                AGB
              </Link>
            </li>
            <li>
              <Link href="/datenschutz" className="hover:text-brand-red">
                Datenschutz
              </Link>
            </li>
            <li>
              <Link href="/impressum" className="hover:text-brand-red">
                Impressum
              </Link>
            </li>
          </ul>
        </div>

        {/* USP / Trust */}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Warum IUMATEC?
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-400">
            <li>✅ Schnelle Lieferung in der ganzen Schweiz</li>
            <li>✅ Schweizer Support innerhalb von 24h</li>
            <li>✅ Sichere Bezahlung (Kreditkarte, TWINT, PostFinance)</li>
          </ul>
        </div>
      </div>

      <div className="border-t dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            © {new Date().getFullYear()} IUMATEC. Alle Rechte vorbehalten.
          </span>
          <span>Made mit ❤️ in der Schweiz.</span>
        </div>
      </div>
    </footer>
  );
}
