import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t bg-gray-50 dark:bg-neutral-900 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 py-10 grid gap-10 sm:grid-cols-2 md:grid-cols-4 text-sm">
        <div>
          <Link href="/" aria-label="Startseite IUMATEC">
            <img src="/logo-iumatec.svg" alt="IUMATEC" className="h-7 mb-3" />
          </Link>
          <p className="text-gray-600 dark:text-gray-300">
            Technik zum besten Preis – schnelle Lieferung in der Schweiz.
          </p>
          <div className="mt-4 space-y-1 text-gray-500 dark:text-gray-400">
            <div>📍 Zürich, Schweiz 🇨🇭</div>
            <div>✉️ support@iumatec.ch</div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Informationen</h3>
          <ul className="space-y-1">
            <li><Link href="/impressum" className="hover:underline">Impressum</Link></li>
            <li><Link href="/datenschutz" className="hover:underline">Datenschutz</Link></li>
            <li><Link href="/agb" className="hover:underline">AGB</Link></li>
            <li><Link href="/kontakt" className="hover:underline">Kontakt</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Zahlungsarten</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Kreditkarte, TWINT, PostFinance, Banküberweisung
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Social Media</h3>
          <p className="text-gray-500 dark:text-gray-400">Folgen Sie uns bald!</p>
        </div>
      </div>

      <div className="text-center py-4 text-gray-500 dark:text-gray-400 border-t dark:border-neutral-800 text-xs">
        © {new Date().getFullYear()} IUMATEC Schweiz. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
