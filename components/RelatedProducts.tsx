import ProductCard from "@/components/ProductCard";
import { getRelatedProducts } from "@/lib/productData";

type Props = {
  currentSku?: string;
  currentSlug?: string;
  category?: string;
  subcategory?: string;
};

export default function RelatedProducts({
  currentSku,
  currentSlug,
  category,
  subcategory,
}: Props) {
  const related = getRelatedProducts(
    currentSlug || currentSku || "",
    category,
    subcategory,
    4
  );

  if (!related.length) return null;

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-extrabold text-neutral-950">
        Ähnliche Produkte
      </h2>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((product) => (
          <ProductCard
            key={`${product.sku}-${product.slug}`}
            product={{
              slug: product.slug,
              title: product.title,
              brand: product.brand,
              price: product.price,
              image: product.image ?? null,
              inStock: product.inStock,
              stockQty: product.stockQty,
              merchandiseId: product.merchandiseId,
              productHandle: product.shopifyProductHandle ?? product.slug,
              energyLabel: product.energyLabel,
            }}
          />
        ))}
      </div>
    </section>
  );
}