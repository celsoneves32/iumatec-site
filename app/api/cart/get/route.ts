import { NextRequest, NextResponse } from "next/server";

const domain =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

const storefrontAccessToken =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const apiVersion =
  process.env.SHOPIFY_API_VERSION ||
  process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION ||
  "2025-04";

function getShopifyUrl() {
  if (!domain) {
    throw new Error("Missing env var: SHOPIFY_STORE_DOMAIN");
  }

  if (!storefrontAccessToken) {
    throw new Error("Missing env var: SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  }

  return `https://${domain}/api/${apiVersion}/graphql.json`;
}

async function shopifyFetch(
  query: string,
  variables?: Record<string, unknown>
) {
  const res = await fetch(getShopifyUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontAccessToken as string,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Shopify returned invalid JSON (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(`Shopify HTTP error ${res.status}`);
  }

  if (json.errors?.length) {
    throw new Error(
      json.errors.map((error: any) => error?.message).filter(Boolean).join(" | ") ||
        "Shopify GraphQL error"
    );
  }

  return json;
}

function mapCart(cart: any) {
  const lines = cart?.lines?.edges ?? [];
  const currencyCode =
    cart?.cost?.subtotalAmount?.currencyCode ||
    cart?.cost?.totalAmount?.currencyCode ||
    "CHF";

  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity ?? 0,
    subtotal: cart.cost?.subtotalAmount?.amount ?? "0",
    total: cart.cost?.totalAmount?.amount ?? "0",
    currencyCode,
    items: lines.map((edge: any) => {
      const line = edge.node;
      const merchandise = line.merchandise;
      const product = merchandise?.product;

      return {
        lineId: line.id,
        merchandiseId: merchandise?.id ?? "",
        productHandle: product?.handle ?? "",
        title: product?.title ?? "",
        variantTitle: merchandise?.title ?? "",
        imageUrl: merchandise?.image?.url ?? null,
        imageAlt: merchandise?.image?.altText ?? null,
        quantity: line.quantity ?? 0,
        unitPrice: line.cost?.amountPerQuantity?.amount ?? "0",
        totalPrice: line.cost?.totalAmount?.amount ?? "0",
        currencyCode: line.cost?.totalAmount?.currencyCode ?? currencyCode,
      };
    }),
  };
}

export async function GET(req: NextRequest) {
  try {
    const cartId = req.nextUrl.searchParams.get("cartId")?.trim() || "";

    if (!cartId) {
      return NextResponse.json(
        { ok: false, error: "Missing cartId" },
        { status: 400 }
      );
    }

    const query = `
      query GetCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          totalQuantity
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                cost {
                  amountPerQuantity {
                    amount
                    currencyCode
                  }
                  totalAmount {
                    amount
                    currencyCode
                  }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    image {
                      url
                      altText
                    }
                    product {
                      handle
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const json = await shopifyFetch(query, { cartId });
    const cart = json?.data?.cart;

    if (!cart) {
      return NextResponse.json(
        { ok: false, error: "Cart not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      cart: mapCart(cart),
    });
  } catch (error) {
    console.error("GET /api/cart/get error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}