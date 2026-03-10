// app/collections/page.tsx

import Link from "next/link";
import Image from "next/image";
import { getCollections } from "@/lib/shopify";

export const metadata = {
  title: "Kategorien",
};

export default async function CollectionsPage() {
  const collections = await getCollections(20);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Kategorien
        </h1>
        <p className="mt-2 text-neutral-600">
          Entdecke unsere Hauptkategorien.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={`/collections/${collection.handle}`}
            className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:shadow-md"
          >
            <div className="relative aspect-[16/10] bg-neutral-100">
              {collection.image?.url ? (
                <Image
                  src={collection.image.url}
                  alt={collection.image.altText || collection.title}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                  Keine Bildvorschau
                </div>
              )}
            </div>

            <div className="p-5">
              <h2 className="text-lg font-semibold text-neutral-900">
                {collection.title}
              </h2>
              {collection.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
                  {collection.description}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
