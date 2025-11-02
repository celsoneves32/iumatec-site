export const metadata = {
  title: "Allgemeine Geschäftsbedingungen (AGB) | IUMATEC Schweiz",
  description: "Allgemeine Geschäftsbedingungen der IUMATEC Schweiz.",
};

export default function AgbPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">
        Allgemeine Geschäftsbedingungen (AGB)
      </h1>

      <p className="mb-4">
        Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle
        Bestellungen über unsere Website und regeln die vertraglichen
        Beziehungen zwischen IUMATEC und den Kunden.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Geltungsbereich</h2>
      <p>
        Diese AGB gelten für alle Produkte, die über unsere Website
        angeboten werden.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Preise und Versand</h2>
      <p>
        Alle Preise verstehen sich in CHF inklusive Mehrwertsteuer. Versandkosten
        werden im Bestellvorgang angezeigt.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Haftung</h2>
      <p>
        IUMATEC haftet nicht für Schäden, die durch unsachgemäße Nutzung
        der Produkte entstehen.
      </p>

      <p className="mt-10 text-sm text-gray-500">
        Letzte Aktualisierung: November 2025
      </p>
    </main>
  );
}
