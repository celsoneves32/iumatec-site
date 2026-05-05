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

      const fallbackImageUrl =
        line.attributes?.find((attr: any) => attr?.key === "_imageUrl")?.value ??
        null;

      return {
        lineId: line.id,
        merchandiseId: merchandise?.id ?? "",
        productHandle: product?.handle ?? "",
        title: product?.title ?? "",
        variantTitle: merchandise?.title ?? "",
        imageUrl: merchandise?.image?.url ?? fallbackImageUrl,
        imageAlt: merchandise?.image?.altText ?? product?.title ?? null,
        quantity: line.quantity ?? 0,
        unitPrice: line.cost?.amountPerQuantity?.amount ?? "0",
        totalPrice: line.cost?.totalAmount?.amount ?? "0",
        currencyCode: line.cost?.totalAmount?.currencyCode ?? currencyCode,
      };
    }),
  };
}

function normalizeVariantId(value?: string | null) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("gid://shopify/ProductVariant/")) {
    return trimmed;
  }

  const numeric = trimmed.replace(/[^\d]/g, "");
  if (!numeric) return null;

  return `gid://shopify/ProductVariant/${numeric}`;
}

async function tryCartLinesAdd(
  cartId: string,
  merchandiseId: string,
  quantity: number,
  imageUrl?: string | null
) {
  const mutation = `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
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
                attributes {
                  key
                  value
                }
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
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    cartId,
    lines: [
      {
        merchandiseId,
        quantity,
        attributes: imageUrl
          ? [
              {
                key: "_imageUrl",
                value: imageUrl,
              },
            ]
          : [],
      },
    ],
  };

  const json = await shopifyFetch(mutation, variables);
  return json?.data?.cartLinesAdd;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const cartId = String(body.cartId || "").trim();
    const quantity = Math.max(1, Number(body.quantity || 1));
    const incomingMerchandiseId = normalizeVariantId(body.merchandiseId);

    const imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;

    if (!cartId) {
      return NextResponse.json(
        { ok: false, error: "Missing cartId" },
        { status: 400 }
      );
    }

    if (!incomingMerchandiseId) {
      return NextResponse.json(
        { ok: false, error: "Missing valid merchandiseId" },
        { status: 400 }
      );
    }

    const payload = await tryCartLinesAdd(
      cartId,
      incomingMerchandiseId,
      quantity,
      imageUrl
    );

    if (payload?.userErrors?.length) {
      return NextResponse.json(
        {
          ok: false,
          error: payload.userErrors.map((item: any) => item.message).join(" | "),
          userErrors: payload.userErrors,
        },
        { status: 400 }
      );
    }

    if (!payload?.cart) {
      return NextResponse.json(
        { ok: false, error: "Add to cart failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      cart: mapCart(payload.cart),
    });
  } catch (error) {
    console.error("POST /api/cart/add error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}