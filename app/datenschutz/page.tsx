export const metadata = {
  title: "Datenschutz | IUMATEC Schweiz",
  description:
    "Informationen zum Datenschutz bei IUMATEC – deine Daten sind bei uns sicher.",
};

export default function DatenschutzPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-semibold mb-4">Datenschutz</h1>

      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Der Schutz deiner persönlichen Daten ist uns wichtig. Wir behandeln
        deine Daten vertraulich und gemäss den gesetzlichen Vorschriften der
        Schweiz (DSG) sowie – soweit anwendbar – der EU-DSGVO.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">1. Verantwortlicher</h2>
      <p className="text-gray-600 dark:text-gray-400">
        IUMATEC Schweiz
        <br />
        Elsässerstrasse 255
        <br />
        4056 Basel
        <br />
        Schweiz
        <br />
        E-Mail:{" "}
        <a
          href="mailto:support@iumatec.ch"
          className="underline underline-offset-2 hover:text-brand-red"
        >
          support@iumatec.ch
        </a>
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">2. Datenerfassung</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Wir erfassen personenbezogene Daten nur, wenn du sie uns freiwillig
        mitteilst, zum Beispiel im Kontaktformular, bei Bestellungen, bei der
        Registrierung eines Kundenkontos oder bei einer Kontaktaufnahme per
        E-Mail.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">3. Datenverwendung</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Deine Daten werden ausschliesslich zur Bearbeitung deiner Bestellung,
        zur Lieferung, zur Kundenkommunikation sowie – sofern gesetzlich erlaubt
        oder von dir ausdrücklich gewünscht – für Service- und
        Informationszwecke verwendet.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">4. Cookies & Tracking</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Unsere Website verwendet Cookies und ähnliche Technologien, um die
        Nutzung der Website zu verbessern, Inhalte technisch bereitzustellen und
        – sofern du zustimmst – Analysen und Marketingmassnahmen zu
        ermöglichen. Du kannst deine Cookie-Einstellungen jederzeit anpassen.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">5. Weitergabe an Dritte</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Eine Weitergabe deiner Daten erfolgt nur, soweit dies zur
        Vertragsabwicklung notwendig ist, z. B. an Zahlungsdienstleister,
        Versandunternehmen oder technische Dienstleister, oder wenn wir
        gesetzlich dazu verpflichtet sind.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">6. Deine Rechte</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Du hast das Recht auf Auskunft, Berichtigung, Löschung oder
        Einschränkung der Verarbeitung deiner gespeicherten personenbezogenen
        Daten, soweit dem keine gesetzlichen Aufbewahrungspflichten
        entgegenstehen.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">7. Kontakt</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Bei Fragen zum Datenschutz kontaktiere uns unter:
        <br />
        <strong>
          <a
            href="mailto:datenschutz@iumatec.ch"
            className="underline underline-offset-2 hover:text-brand-red"
          >
            datenschutz@iumatec.ch
          </a>
        </strong>
      </p>
    </main>
  );
}
