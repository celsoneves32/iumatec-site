export const metadata = {
  title: "Datenschutzerklärung | IUMATEC Schweiz",
  description: "Datenschutzbestimmungen von IUMATEC – Schutz Ihrer persönlichen Daten.",
};

export default function DatenschutzPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Datenschutzerklärung</h1>
      <p className="mb-4">
        Der Schutz Ihrer persönlichen Daten ist uns wichtig. Diese
        Datenschutzerklärung informiert Sie darüber, wie wir Ihre Daten
        verarbeiten, wenn Sie unsere Website besuchen oder unsere Dienste
        nutzen.
      </p>
      <h2 className="text-xl font-semibold mt-8 mb-2">1. Verantwortlicher</h2>
      <p>
        IUMATEC Schweiz<br />
        Zürich, Schweiz<br />
        ✉️ support@iumatec.ch
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Erhebung und Nutzung von Daten</h2>
      <p>
        Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung
        unserer Leistungen erforderlich ist oder Sie eingewilligt haben.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Ihre Rechte</h2>
      <p>
        Sie haben jederzeit das Recht auf Auskunft, Berichtigung oder Löschung Ihrer
        gespeicherten Daten sowie das Recht, der Verarbeitung zu widersprechen.
      </p>

      <p className="mt-10 text-sm text-gray-500">
        Letzte Aktualisierung: November 2025
      </p>
    </main>
  );
}
