export const metadata = {
  title: "FAQ | IUMATEC Schweiz",
  description:
    "Häufig gestellte Fragen zu Bestellung, Lieferung, Zahlung und Rückgabe bei IUMATEC Schweiz.",
};

export default function FAQPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-semibold mb-4">
        FAQ – Häufig gestellte Fragen
      </h1>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Hier findest du Antworten auf die wichtigsten Fragen rund um Bestellung,
        Lieferung, Zahlung und Rückgabe.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-2">
            Wie lange dauert die Lieferung?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Die Lieferung erfolgt normalerweise innerhalb von 2 bis 5 Werktagen
            innerhalb der Schweiz und nach Liechtenstein.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            Welche Zahlungsmethoden werden akzeptiert?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Wir akzeptieren sichere Zahlungsmethoden wie Kreditkarte, TWINT,
            PostFinance und weitere im Checkout angezeigte Zahlungsarten.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            Kann ich meine Bestellung stornieren?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Eine Stornierung ist möglich, solange die Bestellung noch nicht
            bearbeitet oder versendet wurde. Bitte kontaktiere uns so schnell
            wie möglich.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            Kann ich einen Artikel zurückgeben?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Ja, du kannst Artikel innerhalb von 14 Tagen zurückgeben, sofern sie
            unbenutzt, vollständig und in der Originalverpackung sind.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            Was mache ich bei einem defekten Produkt?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Bitte kontaktiere unseren Support mit einer kurzen Beschreibung des
            Problems und – wenn möglich – mit Fotos. Wir helfen dir schnell
            weiter.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            Wie kann ich den Kundenservice kontaktieren?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Du erreichst unseren Support per E-Mail unter:
            <br />
            <a
              href="mailto:support@iumatec.ch"
              className="underline underline-offset-2 hover:text-brand-red"
            >
              support@iumatec.ch
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            Versendet ihr auch ins Ausland?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Der Versand erfolgt derzeit nur innerhalb der Schweiz und nach
            Liechtenstein.
          </p>
        </section>
      </div>

      <p className="mt-10 text-gray-500 text-sm">
        Stand: März 2026 – IUMATEC Schweiz
      </p>
    </main>
  );
}
