
export const metadata = {
  title: "Retouren & Rückgabe | IUMATEC Schweiz",
  description:
    "Informationen zu Rückgabe, Retouren, Garantie und Rückerstattungen bei IUMATEC Schweiz.",
};

const paragraph = "text-gray-600 dark:text-gray-400 mb-4";
const list = "list-disc pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-1";
const heading = "text-xl font-semibold mt-8 mb-3";

export default function RetourenPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 text-gray-800 dark:text-gray-100">
      <h1 className="text-3xl font-semibold mb-4">
        Retouren & Rückgabe
      </h1>

      <p className={paragraph}>
        Deine Zufriedenheit ist uns wichtig. Hier findest du alle
        Informationen zu Rückgaben, Rückerstattungen und
        Reklamationen bei IUMATEC Schweiz.
      </p>

      <h2 className={heading}>
        1. Freiwilliges Rückgaberecht – 14 Tage
      </h2>

      <p className={paragraph}>
        IUMATEC Schweiz gewährt für rückgabeberechtigte Artikel
        ein freiwilliges Rückgaberecht von 14 Kalendertagen
        ab Erhalt der Ware.
      </p>

      <p className={paragraph}>
        Die Rückgabe muss innerhalb dieser Frist per E-Mail
        angemeldet werden. Es gelten die nachstehenden
        Rückgabebedingungen.
      </p>

      <h2 className={heading}>
        2. Voraussetzungen für eine Rückgabe
      </h2>

      <p className={paragraph}>
        Eine reguläre freiwillige Rückgabe ist möglich, wenn
        der Artikel:
      </p>

      <ul className={list}>
        <li>ungeöffnet und unbenutzt ist,</li>
        <li>
          sich in der unbeschädigten Originalverpackung befindet,
        </li>
        <li>
          vollständig mit sämtlichem Zubehör und allen
          Anleitungen zurückgesendet wird,
        </li>
        <li>
          keine Gebrauchsspuren oder Beschädigungen aufweist,
        </li>
        <li>
          nicht ausdrücklich von der freiwilligen Rückgabe
          ausgeschlossen ist.
        </li>
      </ul>

      <h2 className={heading}>
        3. Geöffnete Verpackungen
      </h2>

      <p className={paragraph}>
        Artikel mit bereits geöffneter Originalverpackung
        sind vom regulären freiwilligen Rückgaberecht
        ausgeschlossen.
      </p>

      <p className={paragraph}>
        In Einzelfällen kann IUMATEC Schweiz eine Rücknahme
        aus Kulanz anbieten. Voraussetzung ist eine
        vorherige Prüfung und Zustimmung.
      </p>

      <p className={paragraph}>
        Bei solchen Kulanzrücknahmen können angemessene
        Bearbeitungs- oder Wertminderungsabzüge anfallen.
        Diese werden vor der Rückgabe mitgeteilt und
        individuell vereinbart.
      </p>

      <h2 className={heading}>
        4. Von der freiwilligen Rückgabe ausgeschlossene Artikel
      </h2>

      <p className={paragraph}>
        Insbesondere folgende Artikel sind von der
        freiwilligen Rückgabe ausgeschlossen:
      </p>

      <ul className={list}>
        <li>Benutzte oder beschädigte Produkte</li>
        <li>Unvollständige Produkte oder Zubehörteile</li>
        <li>
          Artikel mit geöffneter oder beschädigter
          Originalverpackung
        </li>
        <li>
          Geöffnete Verbrauchsmaterialien wie Tinte,
          Toner oder Filter
        </li>
        <li>
          Software mit geöffnetem Siegel sowie bereits
          übermittelte oder aktivierte digitale Lizenzen
        </li>
        <li>
          Bereits aktivierte oder registrierte Produkte
        </li>
        <li>
          Geöffnete Hygieneartikel, die aus Hygienegründen
          nicht zur Rückgabe geeignet sind
        </li>
        <li>
          Kundenspezifische Sonderanfertigungen und
          entsprechend gekennzeichnete Sonderbestellungen
        </li>
      </ul>

      <p className={paragraph}>
        Diese Ausschlüsse betreffen ausschliesslich die
        freiwillige Rückgabe mangelfreier Ware.
        Gesetzlich zwingende Ansprüche bei mangelhaften
        Produkten bleiben unberührt.
      </p>

      <h2 className={heading}>
        5. Ablauf einer Rückgabe
      </h2>

      <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 mb-4 space-y-2">
        <li>
          Kontaktiere uns innerhalb von 14 Tagen nach Erhalt
          unter support@iumatec.ch.
        </li>
        <li>
          Teile uns deine Bestellnummer und den betreffenden
          Artikel mit.
        </li>
        <li>
          Wir prüfen deine Anfrage und senden dir die
          entsprechenden Rücksendeanweisungen.
        </li>
        <li>
          Verpacke den Artikel transportsicher und sende ihn
          an die angegebene Rücksendeadresse.
        </li>
        <li>
          Nach Eingang und Prüfung der Ware bearbeiten wir
          die Rückerstattung.
        </li>
      </ol>

      <p className={paragraph}>
        Bitte kontaktiere uns vor dem Versand, damit wir dir
        die korrekte Rücksendeadresse mitteilen können.
        Unangemeldete Rücksendungen können die Bearbeitung
        verzögern.
      </p>

      <h2 className={heading}>
        6. Rücksendekosten
      </h2>

      <p className={paragraph}>
        Bei freiwilligen Rückgaben mangelfreier Ware trägt
        grundsätzlich der Kunde die Rücksendekosten.
      </p>

      <p className={paragraph}>
        Bei berechtigten Reklamationen wegen Defekten,
        Falschlieferungen oder Transportschäden gelten
        die gesetzlichen und vertraglichen Ansprüche.
        Die notwendigen Rücksendekosten werden
        entsprechend behandelt.
      </p>

      <h2 className={heading}>
        7. Rückerstattung
      </h2>

      <p className={paragraph}>
        Nach Eingang und erfolgreicher Prüfung einer
        vertragsgemässen Rücksendung erfolgt die
        Rückerstattung in der Regel innerhalb von
        5 bis 10 Werktagen über die ursprünglich
        verwendete Zahlungsmethode.
      </p>

      <p className={paragraph}>
        Bei ordnungsgemässen Rückgaben ungeöffneter,
        vollständiger und einwandfreier Artikel wird der
        erstattungsfähige Kaufpreis ohne
        Bearbeitungsabzug zurückerstattet.
      </p>

      <p className={paragraph}>
        Für individuell vereinbarte Kulanzrücknahmen
        gelten die zuvor mitgeteilten und vereinbarten
        Rückgabebedingungen.
      </p>

      <h2 className={heading}>
        8. Defekte Artikel, Garantie & Reparaturen
      </h2>

      <p className={paragraph}>
        Sollte ein Artikel defekt sein, nicht korrekt
        funktionieren oder falsch geliefert worden sein,
        kontaktiere bitte unseren Kundendienst.
      </p>

      <p className={paragraph}>
        Teile uns deine Bestellnummer mit und beschreibe
        das Problem möglichst genau. Fotos können
        die Bearbeitung erleichtern.
      </p>

      <p className={paragraph}>
        Wir prüfen den Fall und organisieren die weitere
        Abwicklung, gegebenenfalls gemeinsam mit dem
        Hersteller oder unserem Servicepartner.
      </p>

      <p className={paragraph}>
        Gesetzlich zwingende Gewährleistungsrechte
        bleiben vorbehalten. Garantie- und
        Gewährleistungsfälle werden unabhängig von der
        freiwilligen 14-tägigen Rückgabefrist behandelt.
      </p>

      <h2 className={heading}>
        9. Transportschäden
      </h2>

      <p className={paragraph}>
        Bitte überprüfe deine Lieferung möglichst
        unmittelbar nach Erhalt.
      </p>

      <p className={paragraph}>
        Bei sichtbaren Transportschäden, beschädigter
        Verpackung oder fehlenden Artikeln bitten wir
        dich, uns unverzüglich zu informieren.
      </p>

      <p className={paragraph}>
        Bitte bewahre die Verpackung auf und mache
        nach Möglichkeit Fotos der Beschädigungen.
        Dies erleichtert die schnelle Bearbeitung.
      </p>

      <p className={paragraph}>
        Diese Bitte schränkt zwingende gesetzliche
        Ansprüche nicht ein.
      </p>

      <h2 className={heading}>
        10. Kontakt
      </h2>

      <p className={paragraph}>
        Bei Fragen zu Rückgaben, Reklamationen oder
        Reparaturen erreichst du uns unter:
      </p>

      <p className={paragraph}>
        <strong>IUMATEC Schweiz</strong>
        <br />
        E-Mail:{" "}
        <a
          href="mailto:support@iumatec.ch"
          className="underline underline-offset-2 hover:text-brand-red"
        >
          support@iumatec.ch
        </a>
        <br />
        Website:{" "}
        <a
          href="https://iumatec.ch"
          className="underline underline-offset-2 hover:text-brand-red"
        >
          iumatec.ch
        </a>
      </p>

      <p className="mt-10 text-gray-500 text-sm">
        Stand: Oktober 2026 – IUMATEC Schweiz
      </p>
    </main>
  );
}
