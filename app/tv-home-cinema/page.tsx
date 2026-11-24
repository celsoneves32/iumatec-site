import Link from "next/link";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { queryCatalogProducts, type Product } from "@/lib/supabaseCatalog";
import { TV_HOME_AREAS, classifyTVHomeProduct, isTVHomeArea, type TVHomeArea } from "@/lib/tvHomeCinema";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "TV & Home Cinema | IUMATEC Schweiz",
  description: "Fernseher, Soundbars, Heimkino und TV-Zubehör bei IUMATEC. Endpreise in CHF, Lieferung innerhalb der Schweiz.",
};

const PAGE_SIZE = 24;
const SUPPLIER_PAGE_SIZE = 48;
const MAX_SOURCE_RECORDS = 600;

async function getTVProducts(): Promise<Product[]> {
  const query = { category: "Smart Home", subcategory: "TV & Home Cinema", limit: SUPPLIER_PAGE_SIZE };
  // These are existing, published Supabase entries; do not reimport or rewrite them.
  const first = await queryCatalogProducts({ ...query, offset: 0 });
  const total = Math.min(Math.max(0, first.total), MAX_SOURCE_RECORDS);
  const offsets: number[] = [];
  for (let offset = SUPPLIER_PAGE_SIZE; offset < total; offset += SUPPLIER_PAGE_SIZE) offsets.push(offset);
  const remaining = await Promise.all(offsets.map(offset => queryCatalogProducts({ ...query, offset })));
  const result = [...first.products, ...remaining.flatMap(p => p.products)];
  const unique = new Map<string, Product>();
  for (const item of result) {
    if (!item.slug || !item.title || !(item.price > 0) || !item.merchandiseId || !item.inStock) continue;
    if (!unique.has(item.slug)) unique.set(item.slug, item);
  }
  return [...unique.values()];
}

type Params = { bereich?: string | string[]; seite?: string | string[] };
function valueOf(input?: string | string[]) { return Array.isArray(input) ? input[0] || "" : input || ""; }

export default async function TVHomeCinemaPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const params = (await searchParams) || {};
  const incoming = valueOf(params.bereich);
  const area: TVHomeArea = isTVHomeArea(incoming) ? incoming : "fernseher";
  const wantedPage = Number(valueOf(params.seite) || 1);
  const all = await getTVProducts();
  const groups: Record<TVHomeArea, Product[]> = { fernseher: [], soundbars: [], heimkino: [], "tv-zubehoer": [] };
  for (const product of all) {
    const type = classifyTVHomeProduct(product);
    if (type) groups[type].push(product);
  }
  const chosen = groups[area].sort((a, b) => a.price - b.price);
  const pages = Math.max(1, Math.ceil(chosen.length / PAGE_SIZE));
  const current = Math.min(pages, Number.isSafeInteger(wantedPage) ? Math.max(1, wantedPage) : 1);
  const shown = chosen.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const href = (type: TVHomeArea, page = 1) => `/tv-home-cinema?bereich=${encodeURIComponent(type)}&seite=${page}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-sm font-semibold text-red-600">IUMATEC Schweiz</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">TV & Home Cinema</h1>
      <p className="mt-3 max-w-3xl text-neutral-600">Entdecke Fernseher, Soundbars, Heimkino und passendes TV-Zubehör. Klare Endpreise in CHF, Lieferung innerhalb der Schweiz.</p>
      <nav aria-label="TV & Home Cinema Bereiche" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TV_HOME_AREAS.map((item) => (
          <Link key={item.key} href={href(item.key)} className={`rounded-2xl border p-4 transition hover:border-red-400 ${area === item.key ? "border-red-500 bg-red-50" : "border-neutral-200 bg-white"}`}>
            <div className="font-bold text-neutral-900">{item.label} <span className="text-sm font-normal text-neutral-500">({groups[item.key].length})</span></div>
            <div className="mt-1 text-sm text-neutral-500">{item.subtitle}</div>
          </Link>
        ))}
      </nav>
      <div className="mb-5 mt-10 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-neutral-900">{TV_HOME_AREAS.find(item => item.key === area)?.label}</h2>
        <span className="text-sm text-neutral-500">{chosen.length} Produkte</span>
      </div>
      {shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p) => <ProductCard key={p.slug} product={{ ...p, productHandle: p.shopifyProductHandle || p.slug }} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 p-8 text-neutral-600">Aktuell keine passenden, verfügbaren Produkte in diesem Bereich.</div>
      )}
      {pages > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Seitennavigation">
          {current > 1 ? <Link className="rounded-lg border px-4 py-2" href={href(area, current - 1)}>Zurück</Link> : null}
          <span className="text-sm text-neutral-600">Seite {current} von {pages}</span>
          {current < pages ? <Link className="rounded-lg border px-4 py-2" href={href(area, current + 1)}>Weiter</Link> : null}
        </nav>
      ) : null}
    </main>
  );
}
