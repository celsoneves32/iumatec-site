import Link from "next/link";
import NewsletterForm from "@/components/NewsletterForm";

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
            <img src="/logo-iumatec.svg" alt="IUMATEC" className="h-7 mb-3" />
          </Link>
          <p className="text-gray-600 dark:text-gray-300">
            Technik zum besten Preis – schnelle Lieferung in der Schweiz.
          </p>
          <div className="mt-4 space-y-1 text-gray-500 dark:text-gray-400">
            <div>📍 Zürich, Schweiz 🇨🇭</div>
            <div>
              ✉️{" "}
              <a href="mailto:support@iumatec.ch" className="hover:text-red-600">
                support@iumatec.ch
              </a>
            </div>
          </div>
        </div>

        {/* Shop */}
        <div>
          <h4 className="font-bold mb-2 text-gray-900 dark:text-gray-100">
            Shop
          </h4>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li>
              <Link href="/search?q=smartphones" className="hover:text-red-600">
                Smartphones
              </Link>
            </li>
            <li>
              <Link href="/search?q=tv" className="hover:text-red-600">
                TV & Audio
              </Link>
            </li>
            <li>
              <Link href="/search?q=computer" className="hover:text-red-600">
                Informatik
              </Link>
            </li>
            <li>
              <Link href="/search?q=gaming" className="hover:text-red-600">
                Gaming
              </Link>
            </li>
          </ul>
        </div>

        {/* Information */}
        <div>
          <h4 className="font-bold mb-2 text-gray-900 dark:text-gray-100">
            Information
          </h4>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li>
              <Link href="/kundenservice" className="hover:text-red-600">
                Kundenservice
              </Link>
            </li>
            <li>
              <Link href="/ueber-uns" className="hover:text-red-600">
                Über uns
              </Link>
            </li>
            <li>
              <Link href="/versand" className="hover:text-red-600">
                Versand & Lieferung
              </Link>
            </li>
            <li>
              <Link href="/zahlungsarten" className="hover:text-red-600">
                Zahlungsarten
              </Link>
            </li>
            <li>
              <Link href="/agb" className="hover:text-red-600">
                AGB
              </Link>
            </li>
            <li>
              <Link href="/datenschutz" className="hover:text-red-600">
                Datenschutzerklärung
              </Link>
            </li>
            <li>
              <Link href="/impressum" className="hover:text-red-600">
                Impressum
              </Link>
            </li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="font-bold mb-2 text-gray-900 dark:text-gray-100">
            Newsletter
          </h4>
          <NewsletterForm />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Mit der Anmeldung stimmen Sie unserer{" "}
            <Link href="/datenschutz" className="underline">
              Datenschutzerklärung
            </Link>{" "}
            zu.
          </p>

          <div className="mt-4 text-gray-500 dark:text-gray-400">
            Zahlungsarten:
          </div>
          <div className="mt-2 flex items-center gap-2 opacity-80">
            <img src="/payments/twint.svg" alt="TWINT" className="h-6" />
            <img src="/payments/visa.svg" alt="VISA" className="h-6" />
            <img src="/payments/mastercard.svg" alt="Mastercard" className="h-6" />
            <img src="/payments/applepay.svg" alt="Apple Pay" className="h-6" />
            <img src="/payments/googlepay.svg" alt="Google Pay" className="h-6" />
          </div>
        </div>
      </div>

      <div className="border-t py-4 text-center text-xs text-gray-500 dark:text-gray-400 dark:border-neutral-800">
        © {new Date().getFullYear()} IUMATEC. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
