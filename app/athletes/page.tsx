import Link from "next/link";
import Image from "next/image";
import { athletes } from "@/data/athletes";

export default function AthletesPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400">
            TEAM IUMATEC
          </span>

          <h1 className="mt-8 text-5xl font-black md:text-7xl">
            Athletes proudly supported by IUMATEC
          </h1>

          <p className="mt-6 text-lg text-neutral-300">
            Performance, discipline and commitment. Meet the athletes who
            represent the values of IUMATEC.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete) => (
            <Link
              key={athlete.slug}
              href={`/athletes/${athlete.slug}`}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-red-500/40"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={athlete.image}
                  alt={athlete.name}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
              </div>

              <div className="p-6">
                <p className="text-sm uppercase tracking-widest text-red-400">
                  {athlete.sport}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {athlete.name}
                </h2>

                <p className="mt-2 text-neutral-400">
                  {athlete.location}
                </p>

                <div className="mt-5 font-semibold text-red-400">
                  View Profile →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}