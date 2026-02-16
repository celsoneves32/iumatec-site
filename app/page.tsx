// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import NewsletterSignup from "@/components/NewsletterSignup";
import { shopifyFetch } from "@/lib/shopify";

type HomeProduct = {
  id: string;
  handle: string;
  title: string;
  price: number;
  currencyCode: string;
  imageUrl: string | null;
  imageAlt: string | null;
  variantId: string;
};

type ProductsQuery = {
  products: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
        featuredImage: { url: string; altText: string | null } | null;
        variants: {
          edges: Array<{
            node: {
              id: string;
              price: { amount: string; currencyCode: string };
            };
          }>;
        };
      };
    }>;
  };
};

async function getLatestProducts(limit = 8): Promise<HomeProduct[]> {
  const query = `
    query Products($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            handle
            title
            featuredImage {
              url
              altText
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price {
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
  `;

  try {
    const data = await shopifyFetch<ProductsQuery>({
      query,
      variables: { first: limit },
      cache: "force-cache",
    });

    const edges = data?.products?.edges ?? [];

    const products = edges
      .map((e) => {
        const node = e.node;

        const variant = node.variants?.edges?.[0]?.node;
        if (!variant?.id) return null;

        const featured = node.featuredImage;

        return {
          id: node.id,
          handle: node.handle,
          title: node.title,
          variantId: variant.id,
          price: variant.price?.amount ? Number(variant.price.amount) : 0,
          currencyCode: variant.price?.currencyCode ?? "CHF",
          imageUrl: featured?.url ?? null,
          imageAlt: featured?.altText ?? node.title ?? null,
        } as HomeProduct;
      })
      .filter((p): p is HomeProduct => Boolean(p));

    return products;
  } catch (err) {
    console.error("getLatestProducts error:", err);
    return [];
  }
}

const categories = [
  { title: "Smartphones", href: "/collections/smartphones" },
  { title: "Laptops", href: "/collections/laptops" },
  { title: "Acessórios", href: "/collections/accessories" },
  { title: "Gaming", href: "/collections/gaming" },
];

function Price({ value, currency }: { value: number; currency: string }) {
  const formatted = new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(value);

  return <span>{formatted}</span>;
}

export default async function HomePage() {
  const products = await getLatestProducts(8);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-12">
      {/* HERO */}
      <section className="grid gap-6 md:grid-cols-2 items-center">
        <div className="space-y-4">
          <
