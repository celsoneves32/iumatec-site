export const metadata = {
  title: "Über uns | IUMATEC Schweiz",
  description:
    "Erfahre mehr über IUMATEC – dein Schweizer Partner für Technik zum besten Preis.",
};

export default function AboutPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-4">Über uns</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        IUMATEC ist ein Schweizer Online-Shop, spezialisiert auf Elektronik,
        Technik und Lifestyle-Produkte zu unschlagbaren Preisen.
      </p>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Unser Ziel ist es, hochwertige Produkte mit schneller Lieferung und
        zuverlässigem Kundensupport zu bieten. Wir legen grossen Wert auf
        Transparenz, Qualität und faire Preise.
      </p>

      <div className="grid sm:grid-cols-2 gap-6 mt-8">
        <div className="p-6 rounded-xl border dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <h3 className="text-lg font-semibold mb-2">🚚 Schnelle Lieferung</h3>
          <p className="text-sm text-gray-500">
            Versand aus der Schweiz – in 1–3 Werktagen bei dir.
          </p>
        </div>
        <div className="p-6 rounded-xl border dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <h3 className="text-lg font-semibold mb-2">💳 Sichere Zahlung</h3>
          <p className="text-sm text-gray-500">
            Bezahle bequem mit Kreditkarte, TWINT oder PostFinance.
          </p>
        </div>
      </div>
    </main>
  );
}
