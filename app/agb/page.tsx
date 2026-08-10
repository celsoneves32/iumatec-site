export const metadata = {
  title: "Allgemeine Geschäftsbedingungen (AGB) | IUMATEC Schweiz",
  description:
    "AGB – Allgemeine Geschäftsbedingungen der IUMATEC Schweiz.",
};

export default function AGBPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-semibold mb-4">
        Allgemeine Geschäftsbedingungen (AGB)
      </h1>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Geltungsbereich</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Diese Allgemeinen Geschäftsbedingungen gelten für alle Bestellungen und
        Lieferungen über den Online-Shop von IUMATEC Schweiz.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        2. Angebot und Vertragsschluss
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Die Darstellung der Produkte im Online-Shop stellt kein rechtlich
        bindendes Angebot dar, sondern eine unverbindliche Aufforderung zur
        Bestellung. Mit dem Absenden der Bestellung gibst du ein verbindliches
        Angebot zum Kauf ab. Ein Vertrag kommt erst zustande, wenn wir die
        Bestellung per E-Mail bestätigen.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Preise & Versand</h2>
      <div className="text-gray-600 dark:text-gray-400 mb-4 space-y-3">
        <p>
          Alle Preise verstehen sich in Schweizer Franken (CHF). Die Lieferung
          erfolgt ausschliesslich innerhalb der Schweiz.
        </p>
        <p>
          Für den Standardversand berechnen wir bei einem Bestellwert unter
          CHF 99.– Versandkosten von CHF 9.90. Ab einem Bestellwert von
          CHF 99.– ist der Standardversand kostenlos.
        </p>
        <p>
          Von dieser Versandkostenfreiheit ausgenommen sind Sperrgut,
          besonders schwere oder voluminöse Artikel sowie Lieferungen per
          Spedition. Für solche Artikel gelten besondere Versandkosten, die vor
          Abschluss der Bestellung im Checkout angezeigt werden.
        </p>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Lieferung</h2>
      <div className="text-gray-600 dark:text-gray-400 mb-4 space-y-3">
        <p>
          Der Standardversand erfolgt in der Regel innerhalb von 3 bis 5
          Werktagen, sofern beim Produkt oder im Checkout nichts anderes
          angegeben ist. Bei Sperrgut- und Speditionslieferungen beträgt die
          Lieferzeit in der Regel 3 bis 7 Werktage.
        </p>
        <p>
          Lieferverzögerungen können in Ausnahmefällen vorkommen und
          berechtigen nicht automatisch zu Schadenersatz.
        </p>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Zahlung</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Es gelten die im Checkout angebotenen Zahlungsmethoden. IUMATEC behält
        sich vor, einzelne Zahlungsarten im Einzelfall auszuschliessen.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Rückgabe</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Du hast das Recht, Produkte innert 14 Tagen nach Erhalt zurückzusenden,
        sofern sie ungebraucht, vollständig und in der Originalverpackung sind.
        Bereits benutzte, beschädigte oder unvollständige Artikel können von der
        Rückgabe ausgeschlossen werden.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Gewährleistung</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Es gelten die gesetzlichen Gewährleistungsrechte. Liegt ein Mangel vor,
        ist IUMATEC berechtigt, nach eigener Wahl Ersatz zu liefern,
        nachzubessern oder den Kaufpreis ganz oder teilweise zu erstatten.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Haftung</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        IUMATEC haftet nur für Schäden, die auf grobe Fahrlässigkeit oder
        Vorsatz zurückzuführen sind. Eine Haftung für indirekte Schäden,
        Folgeschäden oder entgangenen Gewinn ist ausgeschlossen, soweit
        gesetzlich zulässig.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">9. Datenschutz</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Informationen zur Bearbeitung personenbezogener Daten findest du in
        unserer Datenschutzerklärung.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">10. Gerichtsstand</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Es gilt ausschliesslich schweizerisches Recht. Soweit gesetzlich
        zulässig, ist der Gerichtsstand am Sitz von IUMATEC Schweiz.
      </p>

      <p className="mt-10 text-gray-500 text-sm">
        Stand: Juli 2026 – IUMATEC Schweiz
      </p>
    </main>
  );
}