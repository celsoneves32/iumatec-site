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

      <p className="mb-6">
        <strong>IUMATEC Schweiz</strong>
        <br />
        Elsässerstrasse 255
        <br />
        4056 Basel
        <br />
        Schweiz
        <br />
        ✉️{" "}
        <a
          href="mailto:support@iumatec.ch"
          className="underline underline-offset-2 hover:text-brand-red"
        >
          support@iumatec.ch
        </a>
      </p>

      <p className="mb-6">
        Verantwortlich für den Inhalt dieser Website:
        <br />
        <strong>Leandro Neves</strong>
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Haftungsausschluss</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Die Inhalte unserer Seiten wurden mit grösster Sorgfalt erstellt. Für
        die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir
        jedoch keine Gewähr übernehmen.
      </p>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Haftungsansprüche gegen IUMATEC wegen Schäden materieller oder
        immaterieller Art, welche aus dem Zugriff oder der Nutzung bzw.
        Nichtnutzung der veröffentlichten Informationen entstanden sind, werden
        ausgeschlossen.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Haftung für Links</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Unsere Website enthält Links zu externen Webseiten Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden
        Inhalte auch keine Gewähr übernehmen.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Urheberrechte</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Die Urheber- und alle anderen Rechte an Inhalten, Bildern, Fotos oder
        anderen Dateien auf dieser Website gehören ausschliesslich IUMATEC oder
        den speziell genannten Rechtsinhabern.
      </p>

      <p className="text-sm text-gray-500 mt-10">
        Letzte Aktualisierung: März 2026
      </p>
    </main>
  );
}
