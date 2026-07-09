"use client";

import Link from "next/link";

const brands = [
  {
    name: "Apple",
    href: "/produkte?brand=Apple",
  },
  {
    name: "Samsung",
    href: "/produkte?brand=Samsung",
  },
  {
    name: "Lenovo",
    href: "/produkte?brand=Lenovo",
  },
  {
    name: "HP",
    href: "/produkte?brand=HP",
  },
  {
    name: "Dell",
    href: "/produkte?brand=Dell",
  },
  {
    name: "ASUS",
    href: "/produkte?brand=ASUS",
  },
  {
    name: "MSI",
    href: "/produkte?brand=MSI",
  },
  {
    name: "Acer",
    href: "/produkte?brand=Acer",
  },
  {
    name: "LG",
    href: "/produkte?brand=LG",
  },
  {
    name: "Philips",
    href: "/produkte?brand=Philips",
  },
];

export default function BrandStrip() {
  return (
    <section className="border-y bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">

        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-widest text-red-600">
            TOP MARKEN
          </p>

          <h2 className="mt-2 text-4xl font-black text-neutral-900">
            Unsere beliebtesten Marken
          </h2>

          <p className="mt-3 text-neutral-500">
            Originalprodukte führender Hersteller.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">

          {brands.map((brand) => (
            <Link
              key={brand.name}
              href={brand.href}
              className="group flex h-24 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-center text-lg font-black transition hover:-translate-y-1 hover:border-red-500 hover:shadow-lg"
            >
              {brand.name}
            </Link>
          ))}

        </div>
      </div>
    </section>
  );
}