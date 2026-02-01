// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import NewsletterSignup from "@/components/NewsletterSignup"; // ✅

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
          imageAlt: (node.featuredImage?.altText as string | null) ?? node.title,
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
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* HERO ---------------------------------------------------------------- */}
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)] items-center">
          {/* ... (o teu código igual) ... */}
        </section>

        {/* ZAHLUNGSMETHODEN / VORTEILE --------------------------------------- */}
        <section className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-700">
          {/* ... (igual) ... */}
        </section>

        {/* BELIEBTE KATEGORIEN ----------------------------------------------- */}
        <section className="space-y-4">
          {/* ... (igual) ... */}
        </section>

        {/* NEU EINGETROFFEN --------------------------------------------------- */}
        <section className="space-y-4">
          {/* ... (igual) ... */}
        </section>
      </main>

      {/* ✅ NEWSLETTER (fora do main para ocupar largura total) */}
      <NewsletterSignup />
    </>
  );
}
