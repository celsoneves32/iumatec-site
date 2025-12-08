// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";

type HomeProduct = {
  id: string;
  handle: string;
  title: string;
  price: number;
  currencyCode: string;
  imageUrl: string | null;
  imageAlt: string | null;
};

async function getLatestProducts(limit = 8): Promise<HomeProduct[]> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2024-04";

  if (!domain || !token) {
    console.error("Missing Shopify env vars for home page");
    return [];
  }

  const query = `
    query HomeProducts($first: Int!) {
      products(first: $first, sortKey:UPDATED_AT, reverse:true) {
        edges {
          node {
            id
            handle
            title
            featuredImage {
              url
              altText
            }
            variants(first:1) {
              edges {
                node {
                  price
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(
      `https://${domain}/admin/api/${apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          query,
          variables: { first: limit },
        }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("Shopify home products error", await res.text());
      return [];
    }

    const json = await res.json();
    const edges = json?.data?.products?.edges ?? [];

    const products: HomeProduct[] = edges
      .map((edge: any) => {
        const node = edge?.node;
        if (!node) return null;

        const variant = node.variants?.edges?.[0]?.node;

        if (!variant?.price) return null;

        return {
          id: node.id as string,
          handle: node.handle as string,
          title: node.title as string,
          price: Number(variant.price),
          currencyCode: (variant.currencyCode as string) || "CHF",
          imageUrl: node.featuredImage?.url ?? null,
          imageAlt:
            (node.featuredImage?.altText as string | null) ?? node.title,
        };
      })
      .filter(Boolean);

    return products as HomeProduct[];
  } catch (err) {
    console.error("Error loading home products", err);
    return [];
  }
}

export default async function HomePage() {
  const latestProducts = await getLatestProducts(8);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* HERO ---------------------------------------------------------------- */}
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)] items-center">
        <div className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-red-600">
            IUMATEC Schweiz
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
            IUMATEC – Technik zu{" "}
            <span className="text-red-600">unschlagbaren Preisen</span>
          </h1>
          <p className="text-sm md:text-base text-neutral-700 max-w-xl">
            Smartphones, TV &amp; Audio, Gaming und mehr – direkt aus der
            Schweiz mit schneller Lieferung und persönlichem Support.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/produkte"
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Top-Deals entdecken
            </Link>
            <Link
              href="/kategorie/computer-gaming"
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:border-red-500 hover:text-red-600"
            >
              Computer &amp; Gaming
            </Link>
            <Link
              href="/kategorie/telefonie-tablet-smartwatch"
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:border-red-500 hover:text-red-600"
            >
              Smartphones
            </Link>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-[11px] text-neutral-600">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-red-50 flex items-center justify-center text-[10px] text-red-600 font-semibold">
                CH
              </span>
              <div>
                <dt className="font-semibold text-neutral-900">
                  Versand in der ganzen Schweiz
                </dt>
                <dd className="text-[11px] text-neutral-500">
                  Schnelle Lieferung mit Schweizer Logistikpartnern.
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-red-50 flex items-center justify-center text-[10px] text-red-600 font-semibold">
                ✔
              </span>
              <div>
                <dt className="font-semibold text-neutral-900">
                  Geprüfte Markenprodukte
                </dt>
                <dd className="text-[11px] text-neutral-500">
                  Originalware mit Hersteller-Garantie.
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-red-50 flex items-center justify-center text-[10px] text-red-600 font-semibold">
                ☎
              </span>
              <div>
                <dt className="font-semibold text-neutral-900">
                  Persönlicher Support
                </dt>
                <dd className="text-[11px] text-neutral-500">
                  Direkter Kontakt bei Fragen &amp; Problemen.
                </dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="relative h-[230px] sm:h-[260px] lg:h-[300px] rounded-3xl overflow-hidden shadow-[0_18px_40px_rgba(15,23,42,0.35)] bg-black">
          <Image
            src="/hero/hero-main.jpg"
            alt="Technik Angebote"
            fill
            priority
            className="object-cover opacity-80"
          />
          <div className="relative z-10 h-full w-full flex flex-col justify-end p-5 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-200 mb-1">
              Aktuelle Aktionen
            </p>
            <p className="text-sm sm:text-base font-semibold mb-1">
              Top-Deals: Smartphones, TV, Laptops &amp; Gaming
            </p>
            <p className="text-[11px] text-neutral-200 max-w-xs">
              Täglich neue Angebote – solange Vorrat reicht.
            </p>
          </div>
        </div>
      </section>

      {/* ZAHLUNGSMETHODEN / VORTEILE --------------------------------------- */}
      <section className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-700">
        <span className="font-semibold text-neutral-900">
          Sicher bezahlen mit:
        </span>
        <span className="rounded-full border border-neutral-200 px-3 py-1">
          VISA
        </span>
        <span className="rounded-full border border-neutral-200 px-3 py-1">
          MasterCard
        </span>
        <span className="rounded-full border border-neutral-200 px-3 py-1">
          TWINT
        </span>
        <span className="rounded-full border border-neutral-200 px-3 py-1">
          PostFinance
        </span>
        <span className="rounded-full border border-neutral-200 px-3 py-1">
          PayPal
        </span>
        <span className="rounded-full border border-neutral-200 px-3 py-1">
          Kauf auf Rechnung
        </span>
        <span className="ml-auto text-[11px] text-neutral-500 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
          SSL-verschlüsselte Zahlung &amp; Schweizer Support
        </span>
      </section>

      {/* BELIEBTE KATEGORIEN ----------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Beliebte Kategorien
          </h2>
          <Link
            href="/produkte"
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Alle Produkte ansehen →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {[
            {
              label: "Smartphones &amp; Wearables",
              href: "/kategorie/telefonie-tablet-smartwatch",
            },
            {
              label: "Computer &amp; Gaming",
              href: "/kategorie/computer-gaming",
            },
            {
              label: "TV &amp; Audio",
              href: "/kategorie/tv-audio",
            },
            {
              label: "Haushalt &amp; Küche",
              href: "/kategorie/haushalt-kueche",
            },
            {
              label: "Garten &amp; Grill",
              href: "/kategorie/garten-grill",
            },
            {
              label: "Zubehör &amp; Kabel",
              href: "/kategorie/zubehoer-kabel",
            },
          ].map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group rounded-2xl border border-neutral-200 bg-white px-3 py-3 flex flex-col justify-between hover:border-red-500 hover:shadow-sm transition"
            >
              <span
                className="block text-[11px] font-semibold text-neutral-900 mb-1"
                dangerouslySetInnerHTML={{ __html: cat.label }}
              />
              <span className="text-[11px] text-red-600 font-semibold group-hover:underline">
                Jetzt entdecken
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* NEU EINGETROFFEN --------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Neu eingetroffen
          </h2>
          <Link
            href="/produkte"
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Alle Neuheiten →
          </Link>
        </div>

        {latestProducts.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Noch keine Produkte in Shopify vorhanden. Sobald du Produkte
            erfasst hast, werden sie hier automatisch angezeigt.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {latestProducts.map((p) => (
              <article
                key={p.id}
                className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-3 hover:shadow-sm transition"
              >
                <Link
                  href={`/produkte/${p.handle}`}
                  className="relative w-full aspect-[4/5] mb-2 rounded-xl overflow-hidden bg-neutral-50"
                >
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.imageAlt || p.title}
                      fill
                      sizes="(min-width: 768px) 200px, 50vw"
                      className="object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-neutral-400">
                      Kein Bild
                    </div>
                  )}
                </Link>
                <Link
                  href={`/produkte/${p.handle}`}
                  className="text-xs font-medium text-neutral-900 line-clamp-2 mb-1 hover:text-red-600"
                >
                  {p.title}
                </Link>
                <div className="text-sm font-semibold text-neutral-900 mb-2">
                  {p.price.toFixed(2)} {p.currencyCode}
                </div>
                <AddToCartButton
                  id={p.handle}
                  title={p.title}
                  price={p.price}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
