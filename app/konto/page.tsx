import KontoAuthenticatedGate from "@/components/KontoAuthenticatedGate";
import Link from "next/link";
import {
  ArrowRight,
  CircleHelp,
  Headphones,
  LockKeyhole,
  Package,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";

export const metadata = {
  title: "Mein Konto | IUMATEC Schweiz",
  description: "Sicher bei IUMATEC anmelden, Kundenkonto eröffnen und Hilfe finden.",
};



function GuestKontoPage() {
  const login = "/api/auth/shopify/login";

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-4 py-9 text-neutral-900 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 text-xs font-semibold text-neutral-500" aria-label="Brotkrumennavigation">
          <Link href="/" className="hover:text-red-700">Startseite</Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-900">Mein Konto</span>
        </nav>

        <section className="grid overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm lg:grid-cols-[1fr_340px]">
          <div className="p-7 sm:p-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-extrabold text-red-700">
              <ShieldCheck size={15} aria-hidden="true" /> IUMATEC Kundenbereich
            </div>
            <h1 className="text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl">
              Mein Konto
            </h1>
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-neutral-950">
              Willkommen bei IUMATEC
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-neutral-600">
              Melde dich sicher an oder erstelle ein Kundenkonto. Danach kannst du deine
              Bestellungen, Lieferadressen und persönlichen Angaben sicher verwalten.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
              <span className="inline-flex items-center gap-2"><LockKeyhole size={17} className="text-red-700" /> Sicherer Zugang</span>
              <span className="inline-flex items-center gap-2"><Package size={17} className="text-red-700" /> Bestellungen</span>
              <span className="inline-flex items-center gap-2"><Truck size={17} className="text-red-700" /> Lieferung Schweiz</span>
            </div>
          </div>

          <div className="flex flex-col justify-center bg-neutral-950 p-7 text-white sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-red-300">Kundenkonto</p>
            <h2 className="mt-3 text-xl font-extrabold">Schön, dass du da bist!</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-300">
              Melde dich mit deiner E-Mail-Adresse und einem Bestätigungscode an.
            </p>
            <a
              href={login}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-red-700"
            >
              Anmelden <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a
              href={login}
              className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white px-5 py-3 text-sm font-extrabold text-neutral-950 transition hover:bg-neutral-100"
            >
              Konto erstellen <UserRound size={17} aria-hidden="true" />
            </a>
            <p className="mt-5 text-center text-xs leading-5 text-neutral-400">
              Neu bei IUMATEC? Gib deine E-Mail-Adresse ein. Dein Konto wird nach der Bestätigung eingerichtet.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Hilfe ohne Anmeldung">
          <Link href="/kontakt" className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-red-300 hover:shadow-md">
            <span className="rounded-2xl bg-red-50 p-3 text-red-700"><Headphones size={23} aria-hidden="true" /></span>
            <span className="flex-1"><span className="block text-base font-extrabold text-neutral-950">Kundenservice</span><span className="mt-1 block text-sm text-neutral-600">Fragen zu Bestellungen oder Produkten?</span></span>
            <ArrowRight size={18} className="shrink-0 text-neutral-500" aria-hidden="true" />
          </Link>
          <Link href="/faq" className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-red-300 hover:shadow-md">
            <span className="rounded-2xl bg-red-50 p-3 text-red-700"><CircleHelp size={23} aria-hidden="true" /></span>
            <span className="flex-1"><span className="block text-base font-extrabold text-neutral-950">Häufige Fragen</span><span className="mt-1 block text-sm text-neutral-600">Antworten rund um den Einkauf</span></span>
            <ArrowRight size={18} className="shrink-0 text-neutral-500" aria-hidden="true" />
          </Link>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-neutral-500">
          Persönliche Bestellungen und Kontodaten werden erst nach der sicheren Anmeldung angezeigt.
        </p>
      </div>
    </main>
  );
}

export default function KontoPage() { return <KontoAuthenticatedGate guest={<GuestKontoPage />} />; }
