export const metadata = {
  title: "Impressum | IUMATEC Schweiz",
  description: "Rechtliche Informationen zur IUMATEC Schweiz.",
};

export default function ImpressumPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Impressum</h1>

      <p className="mb-4">
        Angaben gemäss schweizerischem Recht (Art. 322 OR):
      </p>

      <p className="mb-4">
        <strong>IUMATEC Schweiz</strong><br />
        Zürich, Schweiz<br />
        ✉️ support@iumatec.ch
      </p>

      <p className="mb-4">
        Verantwortlich für den Inhalt dieser Website:<br />
        <strong>Celso Neves</strong>
      </p>

      <p className="text-sm text-gray-500 mt-10">
        Letzte Aktualisierung: November 2025
      </p>
    </main>
  );
}
