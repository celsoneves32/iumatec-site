import ProductsCatalogClient from "@/components/ProductsCatalogClient";
import { queryCatalog } from "@/lib/productData";

export const revalidate = 300;

export default function ProduktePage({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string; subcategory?: string };
}) {
  const initial = queryCatalog({
    q: searchParams?.q,
    category: searchParams?.category,
    subcategory: searchParams?.subcategory,
    limit: 24,
  });

  return (
    <ProductsCatalogClient
      initialData={initial}
      initialQuery={searchParams?.q || ""}
      initialCategory={searchParams?.category || "Alle"}
      initialSubcategory={searchParams?.subcategory || "Alle"}
    />
  );
}
