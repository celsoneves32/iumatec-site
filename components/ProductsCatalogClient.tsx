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

function getSafePrice(price: number | null | undefined) {
  return typeof price === "number" && !Number.isNaN(price) ? price : 0;
}

export default function ProductsCatalogClient({ products }: Props) {
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get("category") || "Alle";
  const initialQuery = searchParams.get("q") || "";

  const prices = useMemo(
    () =>
      products
        .map((p) => p.price)
        .filter((p): p is number => typeof p === "number" && !Number.isNaN(p)),
    [products]
  );

  const absoluteMinPrice = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const absoluteMaxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 10000;

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<number>(absoluteMinPrice);
  const [priceMax, setPriceMax] = useState<number>(absoluteMaxPrice);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    ) as string[];

    return ["Alle", ...values.sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const brands = useMemo(() => {
    const base = products.filter((p) =>
      category === "Alle" ? true : p.category === category
    );

    const values = Array.from(
      new Set(base.map((p) => p.brand).filter(Boolean))
    ) as string[];

    return values.sort((a, b) => a.localeCompare(b)).slice(0, 40);
  }, [products, category]);

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
    setSelectedBrands([]);
    setPriceMin(absoluteMinPrice);
    setPriceMax(absoluteMaxPrice);
    setOnlyInStock(false);
    setSortBy("featured");
  }

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = products.filter((product) => {
      const productPrice = getSafePrice(product.price);

      const matchCategory =
        category === "Alle" ? true : product.category === category;

      const matchBrand =
        selectedBrands.length === 0
          ? true
          : selectedBrands.includes(product.brand || "");

      const matchStock = onlyInStock ? !!product.inStock || (product.stockQty ?? 0) > 0 : true;

      const matchPrice =
        productPrice >= priceMin && productPrice <= priceMax;

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
          const aStock = a.inStock || (a.stockQty ?? 0) > 0 ? 1 : 0;
          const bStock = b.inStock || (b.stockQty ?? 0) > 0 ? 1 : 0;

          if (bStock !== aStock) return bStock - aStock;
          return getSafePrice(b.price) - getSafePrice(a.price);
        }
      }
    });

    return list;
  }, [
    products,
    query,
    category,
    selectedBrands,
    priceMin,
    priceMax,
    onlyInStock,
    sortBy,
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900">
              Produkte
            </h1>
            <p className="mt-2 text-lg text-neutral-600">
              {filteredProducts.length} Produkte verfügbar
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
              className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
            >
              <option value="featured">Empfohlen</option>
              <option value="price-desc">Preis: Hoch zu Tief</option>
              <option value="price-asc">Preis: Tief zu Hoch</option>
              <option value="title-asc">Name: A bis Z</option>
              <option value="brand-asc">Marke: A bis Z</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900">Filter</h2>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
            >
              Zurücksetzen
            </button>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-900">
                Kategorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-neutral-900">Preis</p>

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

              <div className="mt-3 px-1">
                <input
                  type="range"
                  min={absoluteMinPrice}
                  max={absoluteMaxPrice}
                  value={priceMin}
                  onChange={(e) =>
                    setPriceMin(
                      Math.min(Number(e.target.value), priceMax)
                    )
                  }
                  className="w-full"
                />
                <input
                  type="range"
                  min={absoluteMinPrice}
                  max={absoluteMaxPrice}
                  value={priceMax}
                  onChange={(e) =>
                    setPriceMax(
                      Math.max(Number(e.target.value), priceMin)
                    )
                  }
                  className="mt-2 w-full"
                />
              </div>
            </div>

            <div>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                <span className="text-sm font-medium text-neutral-900">
                  Nur verfügbare Produkte
                </span>
              </label>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-neutral-900">Marke</p>

              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {brands.length === 0 ? (
                  <p className="text-sm text-neutral-500">Keine Marken</p>
                ) : (
                  brands.map((brand) => (
                    <label
                      key={brand}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      <span className="text-sm text-neutral-800">{brand}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>

        <section>
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-neutral-500">
              Keine Produkte gefunden.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={`${product.sku}-${product.slug}`}
                  product={product}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}