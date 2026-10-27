
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

      <h2 className="text-xl font-semibold mt-6 mb-2">
        1. Geltungsbereich
      </h2>
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

      <h2 className="text-xl font-semibold mt-6 mb-2">
        3. Preise & Versand
      </h2>
      <div className="text-gray-600 dark:text-gray-400 mb-4 space-y-3">
        <p>
          Alle im Online-Shop angegebenen Preise sind Endpreise in Schweizer
          Franken (CHF). Eine Mehrwertsteuer wird nicht ausgewiesen.
          Die Lieferung erfolgt ausschliesslich innerhalb der Schweiz.
        </p>
        <p>
          Für den Standardversand berechnen wir bei einem Bestellwert unter
          CHF 99.– Versandkosten von CHF 9.90. Ab einem Bestellwert von
          CHF 99.– ist der Standardversand kostenlos.
        </p>
        <p>
          Von dieser Versandkostenfreiheit ausgenommen sind Sperrgut,
          besonders schwere oder voluminöse Artikel sowie Lieferungen per
          Spedition. Für solche Lieferungen gilt ein regulärer Versandtarif
          von CHF 59.–, sofern im Checkout nichts anderes angegeben ist.
          Die geltenden Versandkosten werden vor Abschluss der Bestellung
          im Checkout angezeigt.
        </p>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        4. Lieferung
      </h2>
      <div className="text-gray-600 dark:text-gray-400 mb-4 space-y-3">
        <p>
          Der Standardversand erfolgt in der Regel innerhalb von 1 bis 3
          Werktagen, sofern beim Produkt oder im Checkout nichts anderes
          angegeben ist. Bei Sperrgut- und Speditionslieferungen beträgt die
          Lieferzeit in der Regel 3 bis 7 Werktage.
        </p>
        <p>
          Lieferverzögerungen können in Ausnahmefällen vorkommen und
          berechtigen nicht automatisch zu Schadenersatz.
        </p>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        5. Zahlung
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Es gelten die im Checkout angebotenen Zahlungsmethoden. IUMATEC behält
        sich vor, einzelne Zahlungsarten im Einzelfall auszuschliessen.
      </p>

      {/* Rückgabe – aktualisiert Oktober 2026 */}
      <h2 className="text-xl font-semibold mt-6 mb-2">
        6. Rückgabe und freiwilliges Rückgaberecht
      </h2>

      <div className="text-gray-600 dark:text-gray-400 mb-4 space-y-3">
        <p>
          IUMATEC Schweiz gewährt für rückgabeberechtigte Artikel ein
          freiwilliges Rückgaberecht von 14 Kalendertagen ab Erhalt der Ware.
        </p>

        <p>
          Voraussetzung ist, dass die Produkte ungeöffnet, unbenutzt,
          vollständig und in unbeschädigter Originalverpackung
          zurückgegeben werden.
        </p>

        <p>
          Geöffnete, benutzte, beschädigte, aktivierte oder unvollständige
          Produkte sind vom regulären freiwilligen Rückgaberecht
          ausgeschlossen.
        </p>

        <p>
          Dies gilt insbesondere für geöffnete Verbrauchsmaterialien,
          aktivierte oder bereits übermittelte digitale Lizenzen, bestimmte
          geöffnete Hygieneartikel und entsprechend gekennzeichnete
          Sonderbestellungen.
        </p>

        <p>
          Eine Rücknahme ausserhalb dieser Bedingungen kann im Einzelfall
          aus Kulanz vereinbart werden. Allfällige Bearbeitungs- oder
          Wertminderungsabzüge werden vorab mitgeteilt und individuell
          vereinbart.
        </p>

        <p>
          Rückgaben müssen innerhalb der 14-tägigen Frist per E-Mail an
          support@iumatec.ch angemeldet werden.
          Anschliessend erhält der Kunde die entsprechenden
          Rücksendeanweisungen.
        </p>

        <p>
          Die Rücksendekosten einer freiwilligen Rückgabe mangelfreier
          Ware trägt grundsätzlich der Kunde.
        </p>

        <p>
          Nach Eingang und erfolgreicher Prüfung einer vertragsgemässen
          Rücksendung erfolgt die Rückerstattung in der Regel innerhalb
          von 5 bis 10 Werktagen über die ursprünglich verwendete
          Zahlungsmethode.
        </p>

        <p>
          Bei ordnungsgemässen Rückgaben ungeöffneter, vollständiger und
          einwandfreier Artikel wird der erstattungsfähige Kaufpreis
          ohne Bearbeitungsabzug zurückerstattet.
        </p>

        <p>
          Bei defekten Artikeln, Falschlieferungen oder Transportschäden
          gelten die entsprechenden gesetzlichen und vertraglichen
          Ansprüche. Gesetzlich zwingende Gewährleistungsrechte
          bleiben unberührt.
        </p>

        <p>
          Die vollständigen Rückgabebedingungen und Informationen
          zum Ablauf findest du unter{" "}
          <a
            href="/retouren"
            className="underline underline-offset-2 hover:text-brand-red"
          >
            Retouren & Rückgabe
          </a>.
        </p>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        7. Gewährleistung
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Es gelten die gesetzlichen Gewährleistungsrechte. Liegt ein Mangel vor,
        ist IUMATEC berechtigt, nach eigener Wahl Ersatz zu liefern,
        nachzubessern oder den Kaufpreis ganz oder teilweise zu erstatten.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        8. Haftung
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        IUMATEC haftet nur für Schäden, die auf grobe Fahrlässigkeit oder
        Vorsatz zurückzuführen sind. Eine Haftung für indirekte Schäden,
        Folgeschäden oder entgangenen Gewinn ist ausgeschlossen, soweit
        gesetzlich zulässig.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        9. Datenschutz
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Informationen zur Bearbeitung personenbezogener Daten findest du in
        unserer Datenschutzerklärung.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">
        10. Gerichtsstand
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Es gilt ausschliesslich schweizerisches Recht. Soweit gesetzlich
        zulässig, ist der Gerichtsstand am Sitz von IUMATEC Schweiz.
      </p>

      <p className="mt-10 text-gray-500 text-sm">
        Stand: Oktober 2026 – IUMATEC Schweiz
      </p>
    </main>
  );
}
