import ProductsCatalogClient, {
  type CatalogProduct,
} from "@/components/ProductsCatalogClient";
import { getPurchasableProducts } from "@/lib/productData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ProduktePage() {
  const products = getPurchasableProducts(6000);

  const catalogProducts: CatalogProduct[] = products.map((product) => ({
    sku: product.sku,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    price: product.price,
    image: product.image ?? null,
    category: product.category,
    subcategory: product.subcategory,
    stockQty: product.stockQty,
    inStock: product.inStock,
    merchandiseId: product.merchandiseId,
    shopifyProductHandle: product.shopifyProductHandle,
    productHandle: product.shopifyProductHandle ?? product.slug,
    energyLabel: product.energyLabel,
  }));

  return <ProductsCatalogClient products={catalogProducts} />;
}