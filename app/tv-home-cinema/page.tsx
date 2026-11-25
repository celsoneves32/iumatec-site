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

type Params = {
  bereich?: string | string[];
  seite?: string | string[];
  marke?: string | string[];
  min?: string | string[];
  max?: string | string[];
  groesse?: string | string[];
  technologie?: string | string[];
  typ?: string | string[];
  sort?: string | string[];
};

function tvSize(title: string): string {
  const match = title.match(/(?:^|[^\d])(\d{2,3})\s*(?:"|″|zoll|inch)/i);
  if (!match) return "";
  const size = Number(match[1]);
  return size >= 20 && size <= 120 ? String(size) : "";
}

function tvTechnology(title: string): string {
  if (/mini[\s-]?led/i.test(title)) return "Mini LED";
  if (/oled/i.test(title)) return "OLED";
  if (/qled/i.test(title)) return "QLED";
  if (/\bled\b/i.test(title)) return "LED";
  return "";
}

function productType(title: string, area: TVHomeArea): string {
  if (area === "heimkino") {
    if (/subwoofer/i.test(title)) return "Subwoofer";
    if (/receiver/i.test(title)) return "Receiver";
    if (/set.top.box|iptv|streaming.box/i.test(title)) return "Set-Top-Box";
    if (/blu.ray/i.test(title)) return "Blu-ray";
    if (/surround|heimkino|home.theat|home.cinema/i.test(title)) return "Heimkino-System";
  }
  if (area === "tv-zubehoer") {
    if (/halter|mount|wandhalter/i.test(title)) return "Halterungen";
    if (/fernbe|remote/i.test(title)) return "Fernbedienungen";
    if (/kabel|cable/i.test(title)) return "Kabel";
    if (/adapter|stecker/i.test(title)) return "Adapter";
  }
  if (area === "soundbars") {
    const match = title.match(/\b([2579]\.[012](?:\.[024])?)\b/);
    return match ? match[1] + " Kanäle" : "";
  }
  return "";
}
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
  const source = groups[area];
  const marke = valueOf(params.marke);
  const groesse = valueOf(params.groesse);
  const technologie = valueOf(params.technologie);
  const typ = valueOf(params.typ);
  const sort = valueOf(params.sort) || "price-asc";

  const parsePrice = (value: string) => {
    if (!value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };

  const min = parsePrice(valueOf(params.min));
  const max = parsePrice(valueOf(params.max));

  const unique = (values: string[]) =>
    [...new Set(values.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "de-CH", { numeric: true })
    );

  const brands = unique(source.map(p => p.brand || ""));
  const sizes = unique(source.map(p => tvSize(p.title)));
  const technologies = unique(source.map(p => tvTechnology(p.title)));
  const types = unique(source.map(p => productType(p.title, area)));

  const chosen = source.filter(p => {
    if (marke && p.brand !== marke) return false;
    if (min !== null && p.price < min) return false;
    if (max !== null && p.price > max) return false;
    if (area === "fernseher") {
      if (groesse && tvSize(p.title) !== groesse) return false;
      if (technologie && tvTechnology(p.title) !== technologie) return false;
    } else if (typ && productType(p.title, area) !== typ) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "name") return a.title.localeCompare(b.title, "de-CH");
    return a.price - b.price;
  });

  const pages = Math.max(1, Math.ceil(chosen.length / PAGE_SIZE));
  const current = Math.min(pages, Number.isSafeInteger(wantedPage) ? Math.max(1, wantedPage) : 1);
  const shown = chosen.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const href = (type: TVHomeArea, page = 1) => {
    const query = new URLSearchParams({
      bereich: type,
      seite: String(page),
    });
    if (type === area) {
      if (marke) query.set("marke", marke);
      if (min !== null) query.set("min", String(min));
      if (max !== null) query.set("max", String(max));
      if (groesse) query.set("groesse", groesse);
      if (technologie) query.set("technologie", technologie);
      if (typ) query.set("typ", typ);
      if (sort !== "price-asc") query.set("sort", sort);
    }
    return `/tv-home-cinema?${query.toString()}`;
  };

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
      <form
        action="/tv-home-cinema"
        method="get"
        className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
      >
        <input type="hidden" name="bereich" value={area} />

        <h2 className="mb-4 text-lg font-bold text-neutral-900">
          Produkte filtern
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold">
            Marke
            <select name="marke" defaultValue={marke} className="mt-2 w-full rounded-lg border bg-white p-3">
              <option value="">Alle Marken</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>

          <label className="text-sm font-semibold">
            Preis ab (CHF)
            <input name="min" type="number" min="0" step="0.01"
              defaultValue={min ?? ""}
              placeholder="Min."
              className="mt-2 w-full rounded-lg border bg-white p-3" />
          </label>

          <label className="text-sm font-semibold">
            Preis bis (CHF)
            <input name="max" type="number" min="0" step="0.01"
              defaultValue={max ?? ""}
              placeholder="Max."
              className="mt-2 w-full rounded-lg border bg-white p-3" />
          </label>

          {area === "fernseher" && sizes.length > 0 && (
            <label className="text-sm font-semibold">
              Bildschirmgrösse
              <select name="groesse" defaultValue={groesse} className="mt-2 w-full rounded-lg border bg-white p-3">
                <option value="">Alle Grössen</option>
                {sizes.map(s => <option key={s} value={s}>{s} Zoll</option>)}
              </select>
            </label>
          )}

          {area === "fernseher" && technologies.length > 0 && (
            <label className="text-sm font-semibold">
              Displaytechnologie
              <select name="technologie" defaultValue={technologie} className="mt-2 w-full rounded-lg border bg-white p-3">
                <option value="">Alle Technologien</option>
                {technologies.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          )}

          {area !== "fernseher" && types.length > 0 && (
            <label className="text-sm font-semibold">
              {area === "soundbars" ? "Kanäle" : "Produkttyp"}
              <select name="typ" defaultValue={typ} className="mt-2 w-full rounded-lg border bg-white p-3">
                <option value="">Alle Typen</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          )}

          <label className="text-sm font-semibold">
            Sortieren
            <select name="sort" defaultValue={sort} className="mt-2 w-full rounded-lg border bg-white p-3">
              <option value="price-asc">Preis: aufsteigend</option>
              <option value="price-desc">Preis: absteigend</option>
              <option value="name">Name: A-Z</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit"
            className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700">
            Filter anwenden
          </button>
          <Link href={`/tv-home-cinema?bereich=${area}`}
            className="rounded-xl border border-neutral-300 bg-white px-6 py-3 font-semibold">
            Filter zurücksetzen
          </Link>
          <span className="text-sm text-neutral-600">
            {chosen.length} passende Produkte
          </span>
        </div>
      </form>
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
