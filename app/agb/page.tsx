export const metadata = {
  title: "Allgemeine Geschäftsbedingungen (AGB) | IUMATEC Schweiz",
  description:
    "AGB – Allgemeine Geschäftsbedingungen der IUMATEC Schweiz.",
};

export default function AGBPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-4">
        Allgemeine Geschäftsbedingungen (AGB)
      </h1>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Geltungsbereich</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Diese Allgemeinen Geschäftsbedingungen gelten für alle Bestellungen und
        Lieferungen über den Online-Shop von IUMATEC Schweiz.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Angebot und Vertrag</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Mit der Bestellung gibst du ein verbindliches Angebot ab. Ein Vertrag
        kommt erst zustande, wenn wir die Bestellung bestätigen.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Preise & Versand</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Alle Preise verstehen sich in CHF inkl. MwSt. Der Versand innerhalb der
        Schweiz ist ab CHF 49.– kostenlos.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Rückgabe</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Du hast das Recht, Produkte innert 14 Tagen nach Erhalt ohne Angabe von
        Gründen zurückzusenden, sofern sie ungebraucht und originalverpackt sind.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Haftung</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        IUMATEC haftet nur für Schäden, die auf grobe Fahrlässigkeit oder
        Vorsatz zurückzuführen sind.
      </p>

      <p className="mt-10 text-gray-500 text-sm">
        Stand: November 2025 – IUMATEC Schweiz
      </p>
    </main>
  );
}
