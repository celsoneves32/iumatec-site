// app/kategorie/[handle]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { findCategoryByHandle } from "@/lib/categories";

type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  price: string | null;
};

async function getProductsByCollectionHandle(
  handle: string
): Promise<{ collectionTitle: string; products: ShopifyProduct[] } | null> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2024-04";

  if (!domain || !token) {
    console.error("Shopify Admin Env fehlt");
    return null;
  }

  const endpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

  const query = `
    query CollectionWithProducts($query: String!) {
      collections(first: 1, query: $query) {
        edges {
          node {
            id
            title
            handle
            products(first: 24) {
              edges {
                node {
                  id
                  title
                  handle
                  featuredImage {
                    url
                    altText
                  }
                  priceRangeV2 {
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({
      query,
      variables: { query: `handle:${handle}` },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Shopify Admin Response not OK", await res.text());
    return null;
  }

  const json = await res.json();

  if (json.errors) {
    console.error("Shopify Admin GraphQL errors", json.errors);
    return null;
  }

  const edge = json.data?.collections?.edges?.[0];
  if (!edge) return null;

  const col = edge.node;

  const products: ShopifyProduct[] =
    col.products?.edges?.map((p: any) => {
      const node = p.node;
      const priceData = node.priceRangeV2?.minVariantPrice;
      const price =
        priceData?.amount
          ? `${Number(priceData.amount).toFixed(2)} ${priceData.currencyCode}`
          : null;

      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        featuredImageUrl: node.featuredImage?.url ?? null,
        featuredImageAlt: node.featuredImage?.altText ?? null,
        price,
      };
    }) ?? [];

  return {
    collectionTitle: col.title as string,
    products,
  };
}

type PageProps = {
  params: {
    handle: string;
  };
};

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: PageProps) {
  const handle = params.handle;

  const cat = findCategoryByHandle(handle);
  if (!cat) notFound();

  const { section, item } = cat;
  const pageTitle = item?.title ?? section.title;

  const data = await getProductsByCollectionHandle(handle);
  const products = data?.products ?? [];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-neutral-500">
        <Link href="/" className="hover:text-red-600">
          Startseite
        </Link>
        <span className="mx-1">/</span>
        <Link href={`/kategorie/${section.handle}`} className="hover:text-red-600">
          {section.title}
        </Link>
        {item && (
          <>
            <span className="mx-1">/</span>
            <span className="text-neutral-700">{item.title}</span>
          </>
        )}
      </nav>

      {/* Title + intro */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
          {pageTitle}
        </h1>
        <p className="text-sm text-neutral-600">
          Entdecke ausgewählte Produkte aus der Kategorie{" "}
          <span className="font-medium">{pageTitle}</span> bei IUMATEC.
        </p>
      </header>

      {products.length === 0 ? (
        <div className="border border-dashed border-neutral-300 rounded-2xl p-8 text-center text-sm text-neutral-600 bg-neutral-50">
          In dieser Kategorie sind aktuell noch keine Produkte hinterlegt.
          <br />
          <span className="text-xs text-neutral-500">
            Die Anbindung an Shopify ist bereit – du musst nur Produkte der entsprechenden
            Collection zuordnen.
          </span>
        </div>
      ) : (
        <section>
          <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.handle}`}
                className="group border border-neutral-200 rounded-2xl bg-white overflow-hidden flex flex-col hover:shadow-sm transition-shadow"
              >
                <div className="relative aspect-[3/4] bg-neutral-50">
                  {product.featuredImageUrl ? (
                    <Image
                      src={product.featuredImageUrl}
                      alt={product.featuredImageAlt || product.title}
                      fill
                      className="object-contain p-4 group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
                      Kein Bild
                    </div>
                  )}
                </div>

                <div className="p-3 flex flex-col gap-1">
                  <div className="text-xs text-neutral-500 line-clamp-1">{section.title}</div>
                  <div className="text-sm font-medium leading-tight line-clamp-2">
                    {product.title}
                  </div>
                  {product.price && (
                    <div className="mt-1 text-sm font-semibold text-red-600">
                      {product.price}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
