"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";

export type CatalogProduct = {
  sku: string;
  slug: string;
  title: string;
  brand?: string;
  price: number;
  image?: string | null;
  category?: string;
  subcategory?: string;
  stockQty?: number;
  inStock?: boolean;
  merchandiseId?: string | null;
  shopifyProductHandle?: string | null;
  productHandle?: string | null;
  energyLabel?: any;
};

type Facet = { label: string; count: number };
type CatalogResponse = {
  products: CatalogProduct[];
  total: number;
  catalogTotal: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  facets: {
    categories: Facet[];
    subcategories: Facet[];
    brands: Facet[];
    available: number;
    minPrice: number;
    maxPrice: number;
  };
};

type Props = {
  initialData: CatalogResponse;
  initialQuery: string;
  initialCategory: string;
  initialSubcategory: string;
};

const quickCategories = [
  ["Laptops", "Computer", "Laptops"],
  ["Monitore", "Peripherie", "Monitore"],
  ["Smartphones", "Mobile", "Smartphones"],
  ["Tablets", "Mobile", "Tablets"],
  ["Grafikkarten", "PC-Komponenten", "Grafikkarten"],
  ["Zubehör", "Mobile", "Zubehör"],
];

const formatCount = (value: number) =>
  Math.trunc(value).toLocaleString("de-CH").replace(/\./g, "’");

export default function ProductsCatalogClient({
  initialData,
  initialQuery,
  initialCategory,
  initialSubcategory,
}: Props) {
  const [data, setData] = useState(initialData);
  const [products, setProducts] = useState(initialData.products);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [brands, setBrands] = useState<string[]>([]);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState("featured");
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "Alle") params.set("category", category);
    if (subcategory !== "Alle") params.set("subcategory", subcategory);
    brands.forEach((brand) => params.append("brand", brand));
    if (inStock) params.set("inStock", "1");
    if (sort !== "featured") params.set("sort", sort);
    if (minPrice !== undefined) params.set("minPrice", String(minPrice));
    if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
    params.set("limit", "24");
    return `/api/products?${params}`;
  }, [query, category, subcategory, brands, inStock, sort, minPrice, maxPrice]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(requestUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Katalog konnte nicht geladen werden");
        const next: CatalogResponse = await response.json();
        setData(next);
        setProducts(next.products);
      } catch (error) {
        if ((error as Error).name !== "AbortError") console.error(error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [requestUrl]);

  async function loadMore() {
    setLoading(true);
    try {
      const url = new URL(requestUrl, window.location.origin);
      url.searchParams.set("offset", String(products.length));
      const response = await fetch(`${url.pathname}${url.search}`);
      const next: CatalogResponse = await response.json();
      setProducts((current) => [...current, ...next.products]);
      setData(next);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setQuery("");
    setCategory("Alle");
    setSubcategory("Alle");
    setBrands([]);
    setInStock(false);
    setSort("featured");
    setMinPrice(undefined);
    setMaxPrice(undefined);
  }

  const totalShown = products.length;
  const hasMore = totalShown < data.total;

  return (
    <main className="min-h-screen bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700">
                {formatCount(data.catalogTotal)} Produkte im Katalog
              </div>
              <h1 className="mt-4 text-4xl font-black text-neutral-950 md:text-5xl">
                Produkte
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                {formatCount(data.total)} Produkte gefunden · {formatCount(totalShown)} angezeigt
              </p>
            </div>
            <div className="flex w-full max-w-3xl flex-col gap-3 md:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Suche nach Produkt, Marke oder SKU"
                className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-900"
              />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold"
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
            {quickCategories.map(([label, main, sub]) => (
              <button
                key={label}
                onClick={() => {
                  setCategory(main);
                  setSubcategory(sub);
                  setBrands([]);
                }}
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-extrabold text-neutral-700 hover:border-red-500"
              >
                {label}
              </button>
            ))}
            <button onClick={reset} className="rounded-full border px-4 py-2 text-sm font-extrabold">
              Alle anzeigen
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 xl:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm xl:sticky xl:top-28">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Filter</h2>
            <button onClick={reset} className="rounded-full bg-neutral-100 px-3 py-2 text-xs font-extrabold">
              Zurücksetzen
            </button>
          </div>

          <label className="mt-6 flex items-center justify-between rounded-2xl border p-4">
            <span className="flex items-center gap-3 text-sm font-bold">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
              Sofort lieferbar
            </span>
            <span className="text-xs text-neutral-400">{formatCount(data.facets.available)}</span>
          </label>

          <Filter title="Kategorie">
            {[{ label: "Alle", count: data.catalogTotal }, ...data.facets.categories].slice(0, 13).map((item) => (
              <FilterButton key={item.label} item={item} active={category === item.label} onClick={() => {
                setCategory(item.label);
                setSubcategory("Alle");
                setBrands([]);
              }} />
            ))}
          </Filter>

          <Filter title="Subkategorie">
            <div className="max-h-72 overflow-y-auto">
              {[{ label: "Alle", count: data.total }, ...data.facets.subcategories].slice(0, 41).map((item) => (
                <FilterButton key={item.label} item={item} active={subcategory === item.label} onClick={() => {
                  setSubcategory(item.label);
                  setBrands([]);
                }} />
              ))}
            </div>
          </Filter>

          <Filter title="Preis">
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Min." value={minPrice ?? ""} onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)} className="w-full rounded-xl border px-3 py-2" />
              <input type="number" placeholder="Max." value={maxPrice ?? ""} onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)} className="w-full rounded-xl border px-3 py-2" />
            </div>
          </Filter>

          <Filter title="Marke">
            <div className="max-h-80 overflow-y-auto">
              {data.facets.brands.map((item) => (
                <label key={item.label} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-neutral-50">
                  <span className="flex min-w-0 items-center gap-3">
                    <input type="checkbox" checked={brands.includes(item.label)} onChange={() => setBrands((current) => current.includes(item.label) ? current.filter((brand) => brand !== item.label) : [...current, item.label])} />
                    <span className="truncate text-sm font-semibold">{item.label}</span>
                  </span>
                  <span className="text-xs text-neutral-400">{item.count}</span>
                </label>
              ))}
            </div>
          </Filter>
        </aside>

        <section>
          <h2 className="mb-5 text-2xl font-black">{formatCount(data.total)} Produkte gefunden</h2>
          {products.length ? (
            <>
              <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${loading ? "opacity-70" : ""}`}>
                {products.map((product) => (
                  <ProductCard key={`${product.sku}-${product.slug}`} product={{
                    ...product,
                    productHandle: product.shopifyProductHandle || product.productHandle || product.slug,
                  }} />
                ))}
              </div>
              {hasMore ? (
                <div className="mt-10 text-center">
                  <button disabled={loading} onClick={loadMore} className="rounded-2xl bg-red-600 px-8 py-4 text-sm font-extrabold text-white disabled:opacity-60">
                    {loading ? "Wird geladen…" : "Mehr Produkte laden"}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-3xl border bg-white p-10 text-center">
              <h3 className="text-2xl font-black">Keine Produkte gefunden</h3>
              <button onClick={reset} className="mt-6 rounded-2xl bg-red-600 px-6 py-4 font-extrabold text-white">Alle Produkte anzeigen</button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Filter({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-6 border-t border-neutral-200 pt-5"><h3 className="mb-3 text-sm font-extrabold">{title}</h3>{children}</div>;
}

function FilterButton({ item, active, onClick }: { item: Facet; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${active ? "bg-red-50 font-extrabold text-red-700" : "font-semibold text-neutral-700 hover:bg-neutral-50"}`}>
      <span className="truncate">{item.label}</span><span className="ml-3 text-xs text-neutral-400">{formatCount(item.count)}</span>
    </button>
  );
}
