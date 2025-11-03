export const metadata = {
  title: "Kontakt | IUMATEC Schweiz",
  description:
    "Kontaktiere das IUMATEC Team – wir helfen dir gerne weiter.",
};

export default function KontaktPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-4">Kontakt</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Hast du Fragen zu deiner Bestellung oder zu unseren Produkten?
        Kontaktiere uns – wir helfen dir gerne weiter.
      </p>

      <div className="grid sm:grid-cols-2 gap-8 mt-8">
        <div>
          <h3 className="font-semibold text-lg mb-2">📞 Kundendienst</h3>
          <p className="text-gray-500">E-Mail: support@iumatec.ch</p>
          <p className="text-gray-500">Telefon: +41 44 000 00 00</p>
          <p className="text-gray-500 mt-2">Antwort innert 24 Stunden.</p>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2">📍 Adresse</h3>
          <p className="text-gray-500">
            IUMATEC Schweiz  
            <br /> Zürich, Schweiz 🇨🇭
          </p>
        </div>
      </div>

      <form className="mt-10 grid gap-4 max-w-md">
        <input
          type="text"
          placeholder="Name"
          className="border rounded-lg px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
        />
        <input
          type="email"
          placeholder="E-Mail"
          className="border rounded-lg px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
        />
        <textarea
          placeholder="Nachricht"
          rows={4}
          className="border rounded-lg px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
        />
        <button
          type="submit"
          className="bg-brand-red text-white rounded-lg px-5 py-2 font-semibold hover:bg-brand-blue transition"
        >
          Nachricht senden
        </button>
      </form>
    </main>
  );
}
