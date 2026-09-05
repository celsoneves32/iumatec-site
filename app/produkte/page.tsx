import ProductsCatalogClient from "@/components/ProductsCatalogClient";
import { queryCatalogProducts } from "@/lib/supabaseCatalog";

export const revalidate = 300;

type ProdukteSearchParams = {
  q?: string | string[];
  category?: string | string[];
  subcategory?: string | string[];
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value)
    ? value[0] || ""
    : value || "";
}

export default async function ProduktePage({
  searchParams,
}: {
  searchParams?: Promise<ProdukteSearchParams>;
}) {
  const params =
    (await searchParams) || {};

  const query =
    firstValue(params.q).trim();

  const category =
    firstValue(params.category) ||
    "Alle";

  const subcategory =
    firstValue(params.subcategory) ||
    "Alle";

  const initial =
    await queryCatalogProducts({
      q: query || undefined,

      category:
        category === "Alle"
          ? undefined
          : category,

      subcategory:
        subcategory === "Alle"
          ? undefined
          : subcategory,

      limit: 24,
    });

  return (
    <ProductsCatalogClient
      key={`${query}|${category}|${subcategory}`}
      initialData={initial}
      initialQuery={query}
      initialCategory={category}
      initialSubcategory={subcategory}
    />
  );
}