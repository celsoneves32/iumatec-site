// app/collections/[handle]/page.tsx

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCollectionByHandle } from "@/lib/shopify";

type PageProps = {
  params: {
    handle: string;
  };
};

export default async function CollectionDetailPage({ params }: PageProps) {
  const { collection, products } = await getCollectionByHandle(params.handle);

  if (!collection) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="mt-2 text-neutral-600">{collection.description}</p>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-600">
          Keine Produkte in dieser Kategorie gefunden.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            const price = product.priceRange.minVariantPrice;

            return (
              <Link
                key={product.id}
                href={`/products/${product.handle}`}
                className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:shadow-md"
              >
                <div className="relative aspect-square bg-neutral-100">
                  {product.featuredImage?.url ? (
                    <Image
                      src={product.featuredImage.url}
                      alt={product.featuredImage.altText || product.title}
                      fill
                      className="object-contain p-4 transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      Kein Bild
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h2 className="line-clamp-2 text-sm font-medium text-neutral-900">
                    {product.title}
                  </h2>

                  <div className="mt-3 text-base font-semibold text-neutral-900">
                    {Number(price.amount).toFixed(2)} {price.currencyCode}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
