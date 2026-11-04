import ProductCard from "@/components/ProductCard";
import {
  queryCatalogProducts,
  type Product,
} from "@/lib/supabaseCatalog";

const searches = [
  "Laptop",
  "Monitor",
  "SSD",
  "Headset",
];

function isReady(product: Product) {
  return Boolean(
    product.slug &&
    product.title &&
    product.image &&
    Number(product.price) > 0 &&
    product.inStock === true &&
    Number(product.stockQty ?? 0) > 0 &&
    (product.merchandiseId || product.shopifyVariantId)
  );
}

export default async function BlackNovemberProducts() {
  const responses = await Promise.allSettled(
    searches.map((q) =>
      queryCatalogProducts({
        q,
        limit: 24,
        inStock: true,
        sort: "featured",
      })
    )
  );

  const products: Product[] = [];
  const seen = new Set<string>();

  for (const response of responses) {
    if (response.status !== "fulfilled") continue;

    let added = 0;

    for (const product of response.value.products) {
      if (added >= 5) break;
      if (!isReady(product)) continue;

      const key = product.sku || product.slug;
      if (seen.has(key)) continue;

      seen.add(key);
      products.push(product);
      added++;
    }
  }

  if (!products.length) {
    return null;
  }

  return (
    <section id="produkte" className="py-12">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
          IUMATEC BLACK NOVEMBER
        </p>

        <h2 className="mt-3 text-3xl font-black">
          Unsere Technik-Highlights
        </h2>

        <p className="mt-3 text-sm text-neutral-400">
          Ausgewaehlte Produkte aus unserem
          aktuellen Sortiment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.sku || product.slug}
            product={{
              sku: product.sku,
              slug: product.slug,
              title: product.title,
              brand: product.brand,
              price: Number(product.price),
              image: product.image ?? null,
              category: product.category,
              subcategory: product.subcategory,
              inStock: product.inStock,
              stockQty: product.stockQty,
              merchandiseId:
                product.merchandiseId ||
                product.shopifyVariantId ||
                null,
              productHandle:
                product.shopifyProductHandle ||
                product.slug,
              energyLabel: product.energyLabel,
            }}
          />
        ))}
      </div>

      <p className="mt-7 text-xs leading-6 text-neutral-400">
        Aktuell gelten die regulaeren Katalogpreise.
        Preisreduktionen werden erst nach Pruefung
        separat gekennzeichnet.
      </p>
    </section>
  );
}
