// app/kategorie/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import { getCollectionProductsByHandle } from "@/lib/shopify";

const CATEGORY_CONFIG: Record<
  string,
  { title: string; description: string }
> = {
  smartphones: {
    title: "Smartphones & Handys",
    description:
      "Entdecke unsere Auswahl an aktuellen Smartphones – von Apple iPhone über Samsung Galaxy bis hin zu preiswerten Modellen von Xiaomi und mehr.",
  },
  "tv-audio": {
    title: "TV & Audio",
    description:
      "Fernseher, Soundbars und Heimkino-Systeme für dein Wohnzimmer – gestochen scharfes Bild und satter Sound.",
  },
  "computer-tablets": {
    title: "Computer & Tablets",
    description:
      "Notebooks, PCs und Tablets für Arbeit, Studium und Freizeit – leistungsstark und zuverlässig.",
  },
  "gaming-vr": {
    title: "Gaming & VR",
    description:
      "Konsolen, Gaming-Zubehör und VR-Headsets für dein ultimatives Spielerlebnis.",
  },
};

type CategoryPageProps = {
  params: { slug: string };
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const slug = params.slug;
  const config = CATEGORY_CONFIG[slug];

  if (!config) {
    notFound();
  }

  // 👉 handle da coleção = slug (podes ajustar se quiser)
  const collection = await getCollectionProductsByHandle(slug);

  if (!collection) {
    notFound();
  }

  const products = collection.products.edges.map(({ node }) => ({
    id: node.id,
    handle: node.handle,
    title: node.title,
    price: parseFloat(node.priceRange.minVariantPrice.amount),
    imageUrl: node.featuredImage?.url || "/placeholder-product.png",
    imageAlt: node.featuredImage?.altText || node.title,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Titel + Beschreibung */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
          {config.title}
        </h1>
        <p className="text-sm text-neutral-600 max-w-2xl">
          {config.description}
        </p>
      </div>

      {/* Filter/Sortier-Leiste (optisch) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-xs">
        <div className="inline-flex items-center gap-2">
          <span className="text-neutral-600">Sortieren nach:</span>
          <select className="rounded-md border border-neutral-300 bg-white px-2 py-1">
            <option>Beliebtheit</option>
            <option>Preis aufsteigend</option>
            <option>Preis absteigend</option>
            <option>Neuheiten</option>
          </select>
        </div>
        <div className="inline-flex items-center gap-3 text-neutral-500">
          <span>{products.length} Artikel</span>
        </div>
      </div>

      {/* Grid de produtos vindos do Shopify */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <article
            key={product.id}
            className="group bg-white border border-neutral-200 rounded-2xl p-3 flex flex-col hover:shadow-sm transition-shadow"
          >
            <Link
              href={`/produkte/${product.handle}`}
              className="flex-1 flex flex-col"
            >
              <div className="relative w-full aspect-[4/5] mb-3">
                <Image
                  src={product.imageUrl}
                  alt={product.imageAlt}
                  fill
                  className="object-contain p-2"
                />
              </div>

              <h2 className="text-xs font-medium text-neutral-900 mb-1 line-clamp-2">
                {product.title}
              </h2>

              <div className="mt-auto">
                <div className="text-lg font-semibold text-neutral-900">
                  {product.price.toFixed(2)} CHF
                </div>
                <p className="text-[11px] text-neutral-500">
                  inkl. MwSt., zzgl. Versand
                </p>
              </div>
            </Link>

            <div className="mt-3">
              <AddToCartButton
                id={product.id}
                title={product.title}
                price={product.price}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
