import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import {
  getPurchasableProducts,
  scoreProduct,
  type Product,
} from "@/lib/productData";

type ProduktePageProps = {
  searchParams?: {
    q?: string;
    collection?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    stock?: string;
    price?: string;
    sub?: string;
    energy?: string;
    sort?: string;
  };
};

const categoryLinks = [
  { label: "Laptops", value: "Laptops", category: "Computer" },
  { label: "Desktop-PCs", value: "Desktop-PCs", category: "Computer" },
  { label: "Monitore", value: "Monitors", category: "Peripherie" },
  { label: "Grafikkarten", value: "Grafikkarten", category: "PC-Komponenten" },
  { label: "Smartphones", value: "Smartphones", category: "Mobile" },
  { label: "Tablets", value: "Tablets", category: "Mobile" },
  { label: "Zubehör", value: "Zubehör", category: "Mobile" },
];

const PRIORITY_BRANDS = [
  "apple",
  "samsung",
  "hp",
  "hewlett packard",
  "hp inc.",
  "lenovo",
  "dell",
  "asus",
  "acer",
  "logitech",
  "canon",
  "epson",
  "brother",
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

function productText(product: Product) {
  return normalize(
    [
      product.title,
      product.brand,
      product.sku,
      product.ean,
      product.category,
      product.subcategory,
      product.shopifyProductHandle,
      product.description,
      product.description2,
    ].join(" ")
  );
}

function priceMatches(productPrice: number, priceFilter: string) {
  if (!priceFilter) return true;
  if (priceFilter === "0-100") return productPrice <= 100;
  if (priceFilter === "100-300") return productPrice > 100 && productPrice <= 300;
  if (priceFilter === "300-700") return productPrice > 300 && productPrice <= 700;
  if (priceFilter === "700-1500") return productPrice > 700 && productPrice <= 1500;
  if (priceFilter === "1500+") return productPrice > 1500;
  return true;
}

function countBy(
  products: Product[],
  getter: (product: Product) => string | undefined | null
) {
  const map = new Map<string, number>();

  for (const product of products) {
    const value = getter(product);
    if (!value) continue;

    const cleanValue = String(value).trim();
    if (!cleanValue) continue;

    map.set(cleanValue, (map.get(cleanValue) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function sortBrands(items: { label: string; count: number }[]) {
  return [...items].sort((a, b) => {
    const aBrand = normalize(a.label);
    const bBrand = normalize(b.label);

    const aIndex = PRIORITY_BRANDS.findIndex((brand) =>
      aBrand.includes(normalize(brand))
    );
    const bIndex = PRIORITY_BRANDS.findIndex((brand) =>
      bBrand.includes(normalize(brand))
    );

    if (aIndex >= 0 && bIndex < 0) return -1;
    if (aIndex < 0 && bIndex >= 0) return 1;
    if (aIndex >= 0 && bIndex >= 0 && aIndex !== bIndex) return aIndex - bIndex;

    return b.count - a.count || a.label.localeCompare(b.label);
  });
}

function sortProducts(products: Product[], sort: string) {
  return [...products].sort((a, b) => {
    if (sort === "price-asc") return Number(a.price || 0) - Number(b.price || 0);
    if (sort === "price-desc") return Number(b.price || 0) - Number(a.price || 0);
    if (sort === "stock-desc") return Number(b.stockQty || 0) - Number(a.stockQty || 0);

    const scoreDiff = scoreProduct(b) - scoreProduct(a);
    if (scoreDiff !== 0) return scoreDiff;

    return Number(a.price || 0) - Number(b.price || 0);
  });
}

export default async function ProduktePage({ searchParams }: ProduktePageProps) {
  const q = normalize(searchParams?.q || "");
  const collection = normalize(searchParams?.collection || "");
  const category = normalize(searchParams?.category || "");
  const selectedSubcategory = normalize(
    searchParams?.subcategory || searchParams?.sub || ""
  );
  const brand = normalize(searchParams?.brand || "");
  const stock = normalize(searchParams?.stock || "");
  const price = normalize(searchParams?.price || "");
  const energy = normalize(searchParams?.energy || "");
  const sort = normalize(searchParams?.sort || "recommended");

  const allProducts = getPurchasableProducts(6000);

  const baseFilteredProducts = allProducts.filter((product) => {
    const text = productText(product);
    const productCategory = normalize(product.category);
    const productSubcategory = normalize(product.subcategory);

    const matchesSearch = q ? text.includes(q) : true;
    const matchesCategory = category ? productCategory === category : true;

    const matchesCollection = collection
      ? productSubcategory === collection || productCategory === collection
      : true;

    const matchesSubcategory = selectedSubcategory
      ? productSubcategory === selectedSubcategory
      : true;

    const matchesBrand = brand ? normalize(product.brand) === brand : true;

    const matchesStock =
      stock === "available"
        ? Boolean((product.stockQty ?? 0) > 0 || product.inStock)
        : true;

    const matchesPrice = priceMatches(Number(product.price || 0), price);

    const matchesEnergy = energy
      ? normalize(product.energyLabel?.class) === energy
      : true;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesCollection &&
      matchesSubcategory &&
      matchesBrand &&
      matchesStock &&
      matchesPrice &&
      matchesEnergy
    );
  });

  const filteredProducts = sortProducts(baseFilteredProducts, sort);

  const productsForCounters = allProducts.filter((product) => {
    const text = productText(product);
    const productCategory = normalize(product.category);
    const productSubcategory = normalize(product.subcategory);

    const matchesSearch = q ? text.includes(q) : true;
    const matchesCategory = category ? productCategory === category : true;

    const matchesCollection = collection
      ? productSubcategory === collection || productCategory === collection
      : true;

    const matchesSubcategory = selectedSubcategory
      ? productSubcategory === selectedSubcategory
      : true;

    return matchesSearch && matchesCategory && matchesCollection && matchesSubcategory;
  });

  const brandCounts = sortBrands(countBy(productsForCounters, (product) => product.brand));
  const subcategoryCounts = countBy(productsForCounters, (product) => product.subcategory);
  const energyCounts = countBy(productsForCounters, (product) => product.energyLabel?.class);

  const availableCount = productsForCounters.filter((product) =>
    Boolean((product.stockQty ?? 0) > 0 || product.inStock)
  ).length;

  const priceBuckets = [
    { value: "0-100", label: "Bis CHF 100" },
    { value: "100-300", label: "CHF 100 – 300" },
    { value: "300-700", label: "CHF 300 – 700" },
    { value: "700-1500", label: "CHF 700 – 1500" },
    { value: "1500+", label: "Über CHF 1500" },
  ].map((item) => ({
    ...item,
    count: productsForCounters.filter((p) =>
      priceMatches(Number(p.price || 0), item.value)
    ).length,
  }));

  const makeHref = (params: Record<string, string>) => {
    const next = new URLSearchParams();

    if (category) next.set("category", category);
    if (collection) next.set("collection", collection);
    if (q) next.set("q", q);
    if (brand) next.set("brand", brand);
    if (stock) next.set("stock", stock);
    if (price) next.set("price", price);
    if (selectedSubcategory) next.set("subcategory", selectedSubcategory);
    if (energy) next.set("energy", energy);
    if (sort && sort !== "recommended") next.set("sort", sort);

    Object.entries(params).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });

    const query = next.toString();
    return query ? `/produkte?${query}` : "/produkte";
  };

  const hasActiveFilters = Boolean(
    q ||
      collection ||
      category ||
      brand ||
      stock ||
      price ||
      selectedSubcategory ||
      energy ||
      sort !== "recommended"
  );

  return (
    <main className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-extrabold text-red-700 shadow-sm">
            {allProducts.length}+ Produkte direkt bestellbar
          </div>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-neutral-950 md:text-5xl">
            Alle Produkte
          </h1>

          <p className="mt-3 max-w-3xl text-lg text-neutral-600">
            Verkaufbare Technikprodukte mit Bild, Preis, Lagerbestand und sicherer
            Shopify-Variante.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap gap-3">
          {categoryLinks.map((item) => {
            const active =
              category === normalize(item.category) &&
              selectedSubcategory === normalize(item.value);

            return (
              <Link
                key={`${item.category}-${item.value}`}
                href={`/produkte?category=${encodeURIComponent(
                  item.category
                )}&subcategory=${encodeURIComponent(item.value)}`}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/produkte"
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            Alle anzeigen
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:sticky lg:top-28">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-neutral-950">Filter</h2>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
              {filteredProducts.length}
            </span>
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <h3 className="mb-3 text-sm font-bold text-neutral-950">Suche</h3>

            <form className="space-y-3">
              {category ? <input type="hidden" name="category" value={category} /> : null}
              {collection ? <input type="hidden" name="collection" value={collection} /> : null}
              {brand ? <input type="hidden" name="brand" value={brand} /> : null}
              {stock ? <input type="hidden" name="stock" value={stock} /> : null}
              {price ? <input type="hidden" name="price" value={price} /> : null}
              {selectedSubcategory ? (
                <input type="hidden" name="subcategory" value={selectedSubcategory} />
              ) : null}
              {energy ? <input type="hidden" name="energy" value={energy} /> : null}
              {sort !== "recommended" ? (
                <input type="hidden" name="sort" value={sort} />
              ) : null}

              <input
                type="text"
                name="q"
                defaultValue={searchParams?.q || ""}
                placeholder="Produkt, Marke oder SKU"
                className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-bold text-white"
              >
                Suchen
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <h3 className="mb-3 text-sm font-bold text-neutral-950">
              Verfügbarkeit
            </h3>

            <Link
              href={makeHref({ stock: "available" })}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                stock === "available"
                  ? "bg-red-50 font-bold text-red-700"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <span>Sofort lieferbar</span>
              <span className="text-xs text-neutral-400">{availableCount}</span>
            </Link>

            <Link
              href={makeHref({ stock: "" })}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <span>Alle anzeigen</span>
              <span className="text-xs text-neutral-400">
                {productsForCounters.length}
              </span>
            </Link>
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <h3 className="mb-3 text-sm font-bold text-neutral-950">Preis</h3>

            {priceBuckets.map((item) => (
              <Link
                key={item.value}
                href={makeHref({ price: item.value })}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  price === item.value
                    ? "bg-red-50 font-bold text-red-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs text-neutral-400">{item.count}</span>
              </Link>
            ))}
          </div>

          {energyCounts.length > 0 ? (
            <div className="mt-6 border-t border-neutral-200 pt-5">
              <h3 className="mb-3 text-sm font-bold text-neutral-950">
                Energieklasse
              </h3>

              {energyCounts.slice(0, 12).map((item) => (
                <Link
                  key={item.label}
                  href={makeHref({ energy: normalize(item.label) })}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    energy === normalize(item.label)
                      ? "bg-red-50 font-bold text-red-700"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <span>Klasse {item.label}</span>
                  <span className="text-xs text-neutral-400">{item.count}</span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <h3 className="mb-3 text-sm font-bold text-neutral-950">
              Subkategorie
            </h3>

            {subcategoryCounts.slice(0, 18).map((item) => (
              <Link
                key={item.label}
                href={makeHref({ subcategory: normalize(item.label) })}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  selectedSubcategory === normalize(item.label)
                    ? "bg-red-50 font-bold text-red-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <span className="truncate">{item.label}</span>
                <span className="ml-3 text-xs text-neutral-400">
                  {item.count}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <h3 className="mb-3 text-sm font-bold text-neutral-950">
              Top Marken
            </h3>

            {brandCounts.slice(0, 12).map((item) => (
              <Link
                key={item.label}
                href={makeHref({ brand: normalize(item.label) })}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  brand === normalize(item.label)
                    ? "bg-red-50 font-bold text-red-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <span className="truncate">{item.label}</span>
                <span className="ml-3 text-xs text-neutral-400">
                  {item.count}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <Link
              href="/produkte"
              className="block rounded-2xl border border-neutral-200 px-4 py-3 text-center text-sm font-bold text-neutral-800 hover:bg-neutral-50"
            >
              Filter zurücksetzen
            </Link>
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-neutral-950">
                {filteredProducts.length} Produkte gefunden
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Nur Produkte mit Bild, Preis, Lagerbestand und Shopify-Variante.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {hasActiveFilters ? (
                <Link
                  href="/produkte"
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Filter löschen
                </Link>
              ) : null}

              <div className="flex overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <Link
                  href={makeHref({ sort: "recommended" })}
                  className={`px-4 py-3 text-sm font-bold ${
                    sort === "recommended"
                      ? "bg-neutral-950 text-white"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Empfohlen
                </Link>

                <Link
                  href={makeHref({ sort: "price-asc" })}
                  className={`px-4 py-3 text-sm font-bold ${
                    sort === "price-asc"
                      ? "bg-neutral-950 text-white"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Preis ↑
                </Link>

                <Link
                  href={makeHref({ sort: "price-desc" })}
                  className={`px-4 py-3 text-sm font-bold ${
                    sort === "price-desc"
                      ? "bg-neutral-950 text-white"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Preis ↓
                </Link>
              </div>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
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
          ) : (
            <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center">
              <h3 className="text-2xl font-bold tracking-tight text-neutral-950">
                Keine Produkte gefunden
              </h3>

              <p className="mt-3 text-neutral-600">
                Versuche eine andere Suche oder entferne einige Filter.
              </p>

              <Link
                href="/produkte"
                className="mt-6 inline-flex rounded-2xl bg-red-600 px-6 py-4 text-sm font-extrabold text-white transition hover:bg-red-700"
              >
                Alle Produkte anzeigen
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}