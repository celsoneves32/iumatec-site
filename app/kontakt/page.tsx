export const metadata = {
  title: "Kontakt | IUMATEC Schweiz",
  description: "Kontaktieren Sie IUMATEC Schweiz.",
};

export default function KontaktPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Kontakt</h1>

      <p className="mb-6">
        Wir freuen uns über Ihre Nachricht! Sie können uns über folgende
        Kanäle erreichen:
      </p>

      <ul className="space-y-3">
        <li>📍 Zürich, Schweiz</li>
        <li>✉️ support@iumatec.ch</li>
      </ul>

      <p className="mt-10 text-sm text-gray-500">
        Antwortzeit: innerhalb von 24 Stunden an Werktagen.
      </p>
    </main>
  );
}
