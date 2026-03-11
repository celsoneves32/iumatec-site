export const metadata = {
  title: "Retouren & Rückgabe | IUMATEC Schweiz",
  description:
    "Informationen zu Rückgabe, Retouren und Rückerstattungen bei IUMATEC Schweiz.",
};

export default function RetourenPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-semibold mb-4">Retouren & Rückgabe</h1>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Wir möchten, dass du mit deinem Einkauf bei IUMATEC zufrieden bist.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Rückgaberecht</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Du hast das Recht, Artikel innerhalb von 14 Tagen nach Erhalt der Ware
        zurückzugeben, sofern die nachstehenden Bedingungen erfüllt sind.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Voraussetzungen</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Eine Rückgabe kann nur akzeptiert werden, wenn der Artikel:
      </p>
      <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-1">
        <li>unbenutzt ist,</li>
        <li>sich in der Originalverpackung befindet,</li>
        <li>vollständig mit Zubehör zurückgesendet wird,</li>
        <li>keine Gebrauchsspuren oder Beschädigungen aufweist.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Rücksendekosten</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Die Kosten für die Rücksendung trägt grundsätzlich der Kunde, sofern
        kein Defekt, Falschlieferung oder Transportschaden vorliegt.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Defekte Artikel</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Sollte ein Artikel defekt, beschädigt oder falsch geliefert worden sein,
        kontaktiere bitte unseren Support vor der Rücksendung, damit wir die
        beste Lösung für dich finden können.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Rückerstattung</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Sobald die Rücksendung bei uns eingetroffen und geprüft wurde, erfolgt
        die Rückerstattung in der Regel innerhalb von 5 bis 10 Werktagen über
        die ursprünglich verwendete Zahlungsmethode.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Kontakt</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Bei Fragen zur Rückgabe oder Retoure erreichst du uns unter:
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
