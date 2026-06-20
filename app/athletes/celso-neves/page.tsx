import Image from "next/image";
import Link from "next/link";
import { athletes } from "@/data/athletes";

export default function CelsoNevesPage() {
  const athlete = athletes.find((item) => item.slug === "celso-neves");

  if (!athlete) return null;

  return (
    <main className="bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={athlete.image}
            alt={athlete.name}
            fill
            priority
            className="object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/30" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <Link href="/athletes" className="text-sm text-cyan-400">
            ← Team IUMATEC
          </Link>

          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Sponsored Athlete
          </p>

          <h1 className="mt-4 text-5xl font-bold tracking-tight md:text-7xl">
            {athlete.name}
          </h1>

          <p className="mt-4 text-2xl text-slate-200">
            {athlete.nickname} · {athlete.sport}
          </p>

          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Portuguese boxer based in Basel, Switzerland. Representing discipline,
            hard work and performance inside and outside the ring.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#latest-fight"
              className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950"
            >
              Watch Latest Fight
            </a>

            <a
              href="#about"
              className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white"
            >
              About Celso
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Sport", "Boxing"],
            ["Base", "Basel"],
            ["Nationality", "Portugal"],
            ["Latest Result", "KO Round 1"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="latest-fight" className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
          Latest Fight
        </p>

        <h2 className="mt-4 text-3xl font-bold md:text-5xl">
          {athlete.latestFight}
        </h2>

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube.com/embed/${athlete.youtubeId}`}
            title="Celso Neves Latest Fight"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      <section id="about" className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
          About
        </p>

        <h2 className="mt-4 text-3xl font-bold md:text-5xl">
          Discipline. Family. Performance.
        </h2>

        <p className="mt-6 text-lg leading-8 text-slate-300">
          Celso Neves is a Portuguese boxer based in the Basel region. Balancing
          family life, work and high-level competition, he represents the values
          of discipline, consistency and ambition. As part of Team IUMATEC, Celso
          stands for performance, resilience and continuous improvement.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">
            Proudly Sponsored By
          </p>

          <h2 className="mt-4 text-4xl font-bold">IUMATEC Switzerland</h2>

          <p className="mt-4 text-slate-300">
            Supporting athletes who represent commitment, discipline and performance.
          </p>
        </div>
      </section>
    </main>
  );
}