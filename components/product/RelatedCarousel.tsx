import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/productData";

type RelatedCarouselProps = {
  products: Product[];
};

function getProductSlug(product: Product) {
  const productData = product as any;

  return String(
    productData.slug ||
      productData.shopifyProductHandle ||
      productData.productHandle ||
      "",
  ).trim();
}

function getMerchandiseId(product: Product) {
  const productData = product as any;

  return (
    productData.merchandiseId ||
    productData.shopifyVariantId ||
    null
  );
}

function getStockQty(product: Product) {
  const productData = product as any;

  return Number(
    productData.stockQty ??
      productData.stock ??
      0,
  );
}

export default function RelatedCarousel({
  products,
}: RelatedCarouselProps) {
  const validProducts = products
    .filter((product) => {
      const productData = product as any;
      const slug = getProductSlug(product);
      const price = Number(productData.price || 0);

      return Boolean(
        slug &&
          productData.image &&
          price > 0,
      );
    })
    .slice(0, 8);

  if (!validProducts.length) {
    return null;
  }

  return (
    <section className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-widest text-red-600">
            Weitere Empfehlungen
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">
            Ähnliche Produkte
          </h2>

          <p className="mt-2 max-w-2xl text-neutral-500">
            Weitere Produkte aus derselben Kategorie, die ebenfalls interessant
            sein könnten.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {validProducts.map((product) => {
            const productData = product as any;
            const slug = getProductSlug(product);
            const stockQty = getStockQty(product);

            return (
              <ProductCard
                key={slug}
                product={{
                  sku: productData.sku,
                  slug,
                  title: productData.title,
                  brand: productData.brand,
                  price: Number(productData.price || 0),
                  image: productData.image ?? null,
                  category: productData.category,
                  subcategory: productData.subcategory,
                  inStock: Boolean(
                    productData.inStock ||
                      stockQty > 0,
                  ),
                  stockQty,
                  merchandiseId:
                    getMerchandiseId(product),
                  productHandle:
                    productData.shopifyProductHandle ||
                    productData.productHandle ||
                    slug,
                  energyLabel:
                    productData.energyLabel,
                }}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}