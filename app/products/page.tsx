// app/products/page.tsx
import Link from "next/link";
import Image from "next/image";
import AddToCartButton from "@/components/AddToCartButton";
import { shopifyFetch } from "@/lib/shopify";

type ProductsQuery = {
  products: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
        featuredImage: { url: string; altText: string | null } | null;
        priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
        variants: { edges: Array<{ node: { id: string } }> };
      };
    }>;
  };
};

const PRODUCTS_QUERY = `#graphql
query Products($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
        handle
        title
        featuredImage { url altText }
        priceRange { minVariantPrice { amount currencyCode } }
        variants(first: 1) { edges { node { id } } }
      }
    }
  }
}
`;

export default async function ProductsPage() {
  const data = await shopifyFetch<ProductsQuery>({
    query: PRODUCTS_QUERY,
    variables: { first: 24 },
    cache: "no-store",
  });

  const items = data.products.edges.map((e) => e.node);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Alle Produkte</h1>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => {
          const price = p.priceRange.minVariantPrice;
          const variantId = p.variants.edges[0]?.node.id;

          return (
            <div key={p.id} className="rounded-xl border border-neutral-200 p-3 bg-white">
              <Link href={`/products/${p.handle}`} className="block">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-50">
                  {p.featuredImage ? (
                    <Image
                      src={p.featuredImage.url}
                      alt={p.featuredImage.altText || p.title}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>

                <div className="mt-3 font-medium text-neutral-900">{p.title}</div>
                <div className="text-sm text-neutral-600">
                  {Number(price.amount).toFixed(2)} {price.currencyCode}
                </div>
              </Link>

              {/* Adiciona ao carrinho (CartContext) */}
              <div className="mt-3">
                {variantId ? <AddToCartButton variantId={variantId} /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
