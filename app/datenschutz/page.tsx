export const metadata = {
  title: "Datenschutz | IUMATEC Schweiz",
  description:
    "Informationen zum Datenschutz bei IUMATEC – deine Daten sind bei uns sicher.",
};

export default function DatenschutzPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-4">Datenschutz</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Der Schutz deiner persönlichen Daten ist uns wichtig. Wir behandeln
        deine Daten vertraulich und gemäss den gesetzlichen Vorschriften der
        Schweiz (DSG) und der EU-DSGVO.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">1. Verantwortlicher</h2>
      <p className="text-gray-500">
        IUMATEC Schweiz – Zürich, Schweiz  
        <br />
        E-Mail: support@iumatec.ch
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">2. Datenerfassung</h2>
      <p className="text-gray-500 mb-4">
        Wir erfassen personenbezogene Daten nur, wenn du sie uns freiwillig
        mitteilst (z. B. im Kontaktformular, bei Bestellungen oder im Kundenkonto).
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">3. Datenverwendung</h2>
      <p className="text-gray-500 mb-4">
        Deine Daten werden ausschliesslich zur Bestellabwicklung, Lieferung und
        Kundenkommunikation verwendet.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">4. Cookies & Tracking</h2>
      <p className="text-gray-500 mb-4">
        Unsere Website verwendet Cookies, um die Nutzung zu verbessern. Du
        kannst Cookies in den Browsereinstellungen deaktivieren.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">5. Kontakt</h2>
      <p className="text-gray-500">
        Bei Fragen zum Datenschutz kontaktiere uns unter:
        <br />
        <strong>datenschutz@iumatec.ch</strong>
      </p>
    </main>
  );
}
