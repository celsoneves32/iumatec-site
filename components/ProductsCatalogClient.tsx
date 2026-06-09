"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";

export type CatalogProduct = {
  sku: string;
  slug: string;
  title: string;
  brand?: string;
  price: number | null;
  image: string | null;
  category?: string;
  subcategory?: string;
  stockQty?: number;
  inStock?: boolean;
  merchandiseId?: string | null;
  shopifyProductHandle?: string | null;
  productHandle?: string | null;
  energyLabel?: any;
};

type Props = {
  products: CatalogProduct[];
};

type SortOption =
  | "featured"
  | "price-desc"
  | "price-asc"
  | "title-asc"
  | "brand-asc";

const quickCategories = [
  { label: "Laptops", category: "Computer", subcategory: "Laptops" },
  { label: "Monitore", category: "Peripherie", subcategory: "Monitors" },
  { label: "Smartphones", category: "Mobile", subcategory: "Smartphones" },
  { label: "Tablets", category: "Mobile", subcategory: "Tablets" },
  { label: "Grafikkarten", category: "PC-Komponenten", subcategory: "Grafikkarten" },
  { label: "Zubehör", category: "Mobile", subcategory: "Zubehör" },
];

const priorityBrands = [
  "Apple",
  "Samsung",
  "Microsoft",
  "HP",
  "HP Inc.",
  "Lenovo",
  "Dell",
  "ASUS",
  "Acer",
  "Logitech",
  "AOC",
  "Canon",
  "Epson",
  "Brother",
];

function normalize(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .trim();
}

function getSafePrice(price: number | null | undefined) {
  return typeof price === "number" && !Number.isNaN(price) ? price : 0;
}

function isAvailable(product: CatalogProduct) {
  return Boolean(product.inStock || (product.stockQty ?? 0) > 0);
}

function countItems<T extends string>(
  products: CatalogProduct[],
  getter: (product: CatalogProduct) => T | undefined | null
) {
  const map = new Map<string, number>();

  for (const product of products) {
    const value = getter(product);
    if (!value) continue;

    const clean = String(value).trim();
    if (!clean) continue;

    map.set(clean, (map.get(clean) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function sortBrandCounts(items: { label: string; count: number }[]) {
  return [...items].sort((a, b) => {
    const aNorm = normalize(a.label);
    const bNorm = normalize(b.label);

    const aIndex = priorityBrands.findIndex((brand) =>
      aNorm.includes(normalize(brand))
    );
    const bIndex = priorityBrands.findIndex((brand) =>
      bNorm.includes(normalize(brand))
    );

    const aPriority = aIndex >= 0;
    const bPriority = bIndex >= 0;

    if (aPriority && !bPriority) return -1;
    if (!aPriority && bPriority) return 1;
    if (aPriority && bPriority && aIndex !== bIndex) return aIndex - bIndex;

    return b.count - a.count || a.label.localeCompare(b.label);
  });
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-neutral-200 pt-5">
      <h3 className="mb-3 text-sm font-extrabold text-neutral-950">{title}</h3>
      {children}
    </div>
  );
}

export default function ProductsCatalogClient({ products }: Props) {
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get("category") || "Alle";
  const initialSubcategory = searchParams.get("subcategory") || "Alle";
  const initialQuery = searchParams.get("q") || "";

  const prices = useMemo(
    () =>
      products
        .map((p) => p.price)
        .filter((p): p is number => typeof p === "number" && !Number.isNaN(p)),
    [products]
  );

  const absoluteMinPrice = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const absoluteMaxPrice = prices.length
    ? Math.ceil(Math.max(...prices))
    : 10000;

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<number>(absoluteMinPrice);
  const [priceMax, setPriceMax] = useState<number>(absoluteMaxPrice);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  const baseForCategory = useMemo(() => {
    const q = query.trim().toLowerCase();

    return products.filter((product) => {
      const haystack = [
        product.title,
        product.brand,
        product.sku,
        product.category,
        product.subcategory,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return q ? haystack.includes(q) : true;
    });
  }, [products, query]);

  const categories = useMemo(() => {
    const counts = countItems(baseForCategory, (p) => p.category);
    return [{ label: "Alle", count: baseForCategory.length }, ...counts];
  }, [baseForCategory]);

  const baseForSubcategory = useMemo(() => {
    return baseForCategory.filter((p) =>
      category === "Alle" ? true : normalize(p.category) === normalize(category)
    );
  }, [baseForCategory, category]);

  const subcategories = useMemo(() => {
    const counts = countItems(baseForSubcategory, (p) => p.subcategory);
    return [{ label: "Alle", count: baseForSubcategory.length }, ...counts];
  }, [baseForSubcategory]);

  const baseForBrands = useMemo(() => {
    return baseForSubcategory.filter((p) =>
      subcategory === "Alle"
        ? true
        : normalize(p.subcategory) === normalize(subcategory)
    );
  }, [baseForSubcategory, subcategory]);

  const brandCounts = useMemo(() => {
    return sortBrandCounts(countItems(baseForBrands, (p) => p.brand)).slice(0, 40);
  }, [baseForBrands]);

  const availableCount = useMemo(
    () => baseForBrands.filter(isAvailable).length,
    [baseForBrands]
  );

  const priceBuckets = useMemo(() => {
    const buckets = [
      { label: "Bis CHF 100", min: 0, max: 100 },
      { label: "CHF 100 – 300", min: 100, max: 300 },
      { label: "CHF 300 – 700", min: 300, max: 700 },
      { label: "CHF 700 – 1500", min: 700, max: 1500 },
      { label: "Über CHF 1500", min: 1500, max: Infinity },
    ];

    return buckets.map((bucket) => ({
      ...bucket,
      count: baseForBrands.filter((product) => {
        const price = getSafePrice(product.price);
        return price > bucket.min && price <= bucket.max;
      }).length,
    }));
  }, [baseForBrands]);

  function toggleBrand(brand: string) {
    setSelectedBrands((prev) =>
      prev.includes(brand)
        ? prev.filter((b) => b !== brand)
        : [...prev, brand]
    );
  }

  function resetFilters() {
    setQuery("");
    setCategory("Alle");
    setSubcategory("Alle");
    setSelectedBrands([]);
    setPriceMin(absoluteMinPrice);
    setPriceMax(absoluteMaxPrice);
    setOnlyInStock(false);
    setSortBy("featured");
  }

  function applyQuickCategory(item: {
    category: string;
    subcategory: string;
  }) {
    setCategory(item.category);
    setSubcategory(item.subcategory);
    setSelectedBrands([]);
  }

  function applyPriceBucket(min: number, max: number) {
    setPriceMin(min);
    setPriceMax(max === Infinity ? absoluteMaxPrice : max);
  }

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = products.filter((product) => {
      const productPrice = getSafePrice(product.price);

      const matchCategory =
        category === "Alle"
          ? true
          : normalize(product.category) === normalize(category);

      const matchSubcategory =
        subcategory === "Alle"
          ? true
          : normalize(product.subcategory) === normalize(subcategory);

      const matchBrand =
        selectedBrands.length === 0
          ? true
          : selectedBrands.includes(product.brand || "");

      const matchStock = onlyInStock ? isAvailable(product) : true;

      const matchPrice = productPrice >= priceMin && productPrice <= priceMax;

      const haystack = [
        product.title,
        product.brand,
        product.sku,
        product.category,
        product.subcategory,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchQuery = q ? haystack.includes(q) : true;

      return (
        matchCategory &&
        matchSubcategory &&
        matchBrand &&
        matchStock &&
        matchPrice &&
        matchQuery
      );
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "price-desc":
          return getSafePrice(b.price) - getSafePrice(a.price);
        case "price-asc":
          return getSafePrice(a.price) - getSafePrice(b.price);
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "brand-asc":
          return (a.brand || "").localeCompare(b.brand || "");
        case "featured":
        default: {
          const aStock = isAvailable(a) ? 1 : 0;
          const bStock = isAvailable(b) ? 1 : 0;

          if (bStock !== aStock) return bStock - aStock;

          const aHasImage = a.image ? 1 : 0;
          const bHasImage = b.image ? 1 : 0;

          if (bHasImage !== aHasImage) return bHasImage - aHasImage;

          return getSafePrice(b.price) - getSafePrice(a.price);
        }
      }
    });

    return list;
  }, [
    products,
    query,
    category,
    subcategory,
    selectedBrands,
    priceMin,
    priceMax,
    onlyInStock,
    sortBy,
  ]);

  const hasActiveFilters =
    query ||
    category !== "Alle" ||
    subcategory !== "Alle" ||
    selectedBrands.length > 0 ||
    priceMin !== absoluteMinPrice ||
    priceMax !== absoluteMaxPrice ||
    onlyInStock ||
    sortBy !== "featured";

  return (
    <main className="bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700">
                {products.length.toLocaleString("de-CH")} Produkte verfügbar
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-neutral-950 md:text-5xl">
                Produkte
              </h1>

              <p className="mt-2 max-w-2xl text-base text-neutral-600">
                Technikprodukte mit transparentem Preis, Lagerbestand und
                sicherem Checkout.
              </p>
            </div>

            <div className="flex w-full max-w-3xl flex-col gap-3 md:flex-row">
              <input
                type="text"
                placeholder="Suche nach Produkt, Marke oder SKU"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
              />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-neutral-900"
              >
                <option value="featured">Empfohlen</option>
                <option value="price-desc">Preis: Hoch zu Tief</option>
                <option value="price-asc">Preis: Tief zu Hoch</option>
                <option value="title-asc">Name: A bis Z</option>
                <option value="brand-asc">Marke: A bis Z</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {quickCategories.map((item) => {
              const active =
                normalize(category) === normalize(item.category) &&
                normalize(subcategory) === normalize(item.subcategory);

              return (
                <button
                  key={`${item.category}-${item.subcategory}`}
                  type="button"
                  onClick={() => applyQuickCategory(item)}
                  className={`rounded-full border px-4 py-2 text-sm font-extrabold transition ${
                    active
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-extrabold text-neutral-700 hover:border-neutral-400"
            >
              Alle anzeigen
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 xl:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm xl:sticky xl:top-28">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-neutral-950">Filter</h2>
              <p className="mt-1 text-xs font-semibold text-neutral-500">
                {filteredProducts.length.toLocaleString("de-CH")} Treffer
              </p>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full bg-neutral-100 px-3 py-2 text-xs font-extrabold text-neutral-700 hover:bg-neutral-200"
            >
              Zurücksetzen
            </button>
          </div>

          {hasActiveFilters ? (
            <div className="mt-5 rounded-2xl bg-red-50 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-red-700">
                Aktive Filter
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {category !== "Alle" ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700">
                    {category}
                  </span>
                ) : null}

                {subcategory !== "Alle" ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700">
                    {subcategory}
                  </span>
                ) : null}

                {onlyInStock ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700">
                    Sofort lieferbar
                  </span>
                ) : null}

                {selectedBrands.map((brand) => (
                  <span
                    key={brand}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700"
                  >
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 space-y-6">
            <FilterSection title="Verfügbarkeit">
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50">
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <span className="text-sm font-bold text-neutral-900">
                    Sofort lieferbar
                  </span>
                </span>

                <span className="text-xs font-bold text-neutral-400">
                  {availableCount}
                </span>
              </label>
            </FilterSection>

            <FilterSection title="Kategorie">
              <div className="space-y-1">
                {categories.slice(0, 12).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setCategory(item.label);
                      setSubcategory("Alle");
                      setSelectedBrands([]);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                      category === item.label
                        ? "bg-red-50 font-extrabold text-red-700"
                        : "font-semibold text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="ml-3 text-xs text-neutral-400">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Subkategorie">
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {subcategories.slice(0, 40).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSubcategory(item.label);
                      setSelectedBrands([]);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                      subcategory === item.label
                        ? "bg-red-50 font-extrabold text-red-700"
                        : "font-semibold text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="ml-3 text-xs text-neutral-400">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Preis">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={priceMin}
                  min={absoluteMinPrice}
                  max={priceMax}
                  onChange={(e) =>
                    setPriceMin(
                      Math.max(
                        absoluteMinPrice,
                        Math.min(Number(e.target.value || 0), priceMax)
                      )
                    )
                  }
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                />

                <input
                  type="number"
                  value={priceMax}
                  min={priceMin}
                  max={absoluteMaxPrice}
                  onChange={(e) =>
                    setPriceMax(
                      Math.min(
                        absoluteMaxPrice,
                        Math.max(Number(e.target.value || 0), priceMin)
                      )
                    )
                  }
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
                />
              </div>

              <div className="mt-3 space-y-1">
                {priceBuckets.map((bucket) => (
                  <button
                    key={bucket.label}
                    type="button"
                    onClick={() => applyPriceBucket(bucket.min, bucket.max)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <span>{bucket.label}</span>
                    <span className="ml-3 text-xs text-neutral-400">
                      {bucket.count}
                    </span>
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Marke">
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {brandCounts.length === 0 ? (
                  <p className="text-sm text-neutral-500">Keine Marken</p>
                ) : (
                  brandCounts.map((item) => (
                    <label
                      key={item.label}
                      className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition hover:bg-neutral-50"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(item.label)}
                          onChange={() => toggleBrand(item.label)}
                          className="h-4 w-4 rounded border-neutral-300"
                        />
                        <span className="truncate text-sm font-semibold text-neutral-800">
                          {item.label}
                        </span>
                      </span>

                      <span className="ml-3 text-xs font-bold text-neutral-400">
                        {item.count}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </FilterSection>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-neutral-950">
                {filteredProducts.length.toLocaleString("de-CH")} Produkte gefunden
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Produkte mit Bild, Preis, Lagerbestand und Shopify-Variante.
              </p>
            </div>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-extrabold text-neutral-700 hover:bg-neutral-50"
              >
                Filter löschen
              </button>
            ) : null}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center">
              <h3 className="text-2xl font-black text-neutral-950">
                Keine Produkte gefunden
              </h3>

              <p className="mt-3 text-neutral-600">
                Versuche eine andere Suche oder entferne einige Filter.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 rounded-2xl bg-red-600 px-6 py-4 text-sm font-extrabold text-white hover:bg-red-700"
              >
                Alle Produkte anzeigen
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={`${product.sku}-${product.slug}`}
                  product={{
                    slug: product.slug,
                    title: product.title,
                    brand: product.brand,
                    price: getSafePrice(product.price),
                    image: product.image ?? null,
                    inStock: product.inStock,
                    stockQty: product.stockQty,
                    merchandiseId: product.merchandiseId,
                    productHandle:
                      product.shopifyProductHandle ??
                      product.productHandle ??
                      product.slug,
                    energyLabel: product.energyLabel,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}