"use client";

export default function Newsletter() {
  return (
    <section className="bg-neutral-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-red-500">
            IUMATEC Newsletter
          </p>

          <h2 className="mt-3 text-4xl font-black leading-tight">
            Deals, neue Produkte und Tech-Angebote direkt per Mail.
          </h2>

          <p className="mt-4 max-w-xl text-neutral-300">
            Erhalte ausgewählte Angebote, neue Produkte und Aktionen von
            IUMATEC Schweiz.
          </p>
        </div>

        <form className="rounded-[2rem] border border-white/10 bg-white/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Deine E-Mail-Adresse"
              className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-white px-5 text-sm font-semibold text-neutral-950 outline-none"
            />

            <button
              type="button"
              className="min-h-14 rounded-2xl bg-red-600 px-7 text-sm font-black text-white transition hover:bg-red-700"
            >
              Abonnieren
            </button>
          </div>

          <p className="mt-3 text-xs text-neutral-400">
            Kein Spam. Du kannst dich jederzeit wieder abmelden.
          </p>
        </form>
      </div>
    </section>
  );
}