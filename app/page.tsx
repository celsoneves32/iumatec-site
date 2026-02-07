import Image from "next/image";
import Link from "next/link";
import NewsletterSignup from "@/components/NewsletterSignup";
import BuyNowButton from "@/components/BuyNowButton";
import { shopifyFetch } from "@/lib/shopify";

type HomeProduct = {
  id: string;
  handle: string;
  title: string;
  price: number;
  currencyCode: string;
  imageUrl: string | null;
  imageAlt: string | null;
  variantId: string; // ✅ necessário para checkout
};

async function getLatestProducts(limit = 8): Promise<HomeProduct[]> {
  const query = `
    query LatestProducts($first: Int!) {
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

  const data = await shopifyFetch<{
    products: {
      edges: Array<{
        node: {
          id: string;
          handle: string;
          title: string;
          featuredImage?: { url: string; altText?: string | null } | null;
          variants: { edges: Array<{ node: { id: string; price: { amount: string; currencyCode: string } } }> };
        };
      }>;
    };
  }>({
    query,
    variables: { first: limit },
    cache: "force-cache",
  });

  return (data.products.edges ?? []).map(({ node }) => {
    const v = node.variants.edges?.[0]?.node;
    return {
      id: node.id,
      handle: node.handle,
      title: node.title,
      variantId: v?.id,
      price: v?.price?.amount ? Number(v.price.amount) : 0,
      currencyCode: v?.price?.currencyCode ?? "CHF",
      imageUrl: node.featuredImage?.url ?? null,
      imageAlt: node.featuredImage?.altText ?? node.title ?? null,
    };
  }).filter(p => !!p.variantId); // garante variant
}
