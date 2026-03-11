export const metadata = {
  title: "Versand & Lieferung | IUMATEC Schweiz",
  description:
    "Informationen zu Versand, Lieferzeiten und Versandkosten bei IUMATEC Schweiz.",
};

export default function VersandPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-semibold mb-4">Versand & Lieferung</h1>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Wir liefern schnell und zuverlässig in die ganze Schweiz und nach
        Liechtenstein.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Versandgebiet</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Der Versand erfolgt ausschliesslich innerhalb der Schweiz und nach
        Liechtenstein.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Lieferzeit</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Die Lieferung erfolgt in der Regel innerhalb von 2 bis 5 Werktagen nach
        Bestelleingang, sofern beim jeweiligen Produkt nichts anderes angegeben
        ist.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Versandkosten</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Die Versandkosten werden im Bestellprozess separat ausgewiesen. Ab einem
        bestimmten Bestellwert können Lieferungen versandkostenfrei erfolgen.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Versandpartner</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Unsere Bestellungen werden je nach Produkt und Verfügbarkeit mit
        geeigneten Versanddienstleistern wie Die Post, DHL oder DPD versendet.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Sendungsverfolgung</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Sobald deine Bestellung versendet wurde, erhältst du – sofern verfügbar
        – eine Versandbestätigung mit Tracking-Informationen per E-Mail.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        6. Lieferverzögerungen
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        In Ausnahmefällen kann es aufgrund hoher Nachfrage, Lieferengpässen oder
        externer Transportverzögerungen zu längeren Lieferzeiten kommen. In
        einem solchen Fall informieren wir dich schnellstmöglich.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        7. Beschädigte Lieferung
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Sollte deine Bestellung beschädigt bei dir ankommen, kontaktiere uns
        bitte umgehend unter:
        <br />
        <a
          href="mailto:support@iumatec.ch"
          className="underline underline-offset-2 hover:text-brand-red"
        >
          support@iumatec.ch
        </a>
      </p>

      <p className="mt-10 text-gray-500 text-sm">
        Stand: März 2026 – IUMATEC Schweiz
      </p>
    </main>
  );
}
