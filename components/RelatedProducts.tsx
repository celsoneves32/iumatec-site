import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/productData";

export default async function RelatedProducts({ currentSku }: any) {
  const products = await getProducts();

  const related = products
    .filter((p: any) => p.sku !== currentSku)
    .slice(0, 4);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {related.map((p: any) => (
        <ProductCard key={p.sku} product={p} />
      ))}
    </div>
  );
}