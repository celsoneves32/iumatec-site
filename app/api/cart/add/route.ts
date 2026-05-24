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
  if (!domain) throw new Error("Missing env var: SHOPIFY_STORE_DOMAIN");
  if (!storefrontAccessToken) throw new Error("Missing env var: SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  return `https://${domain}/api/${apiVersion}/graphql.json`;
}

async function shopifyFetch(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(getShopifyUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontAccessToken as string,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok) throw new Error(`Shopify HTTP error ${res.status}`);

  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e: any) => e?.message).filter(Boolean).join(" | ") ||
        "Shopify GraphQL error"
    );
  }

  return json;
}

function normalizeVariantId(value?: string | null) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("gid://shopify/ProductVariant/")) return trimmed;
  const numeric = trimmed.replace(/[^\d]/g, "");
  return numeric ? `gid://shopify/ProductVariant/${numeric}` : null;
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

async function findCurrentVariantByHandle(productHandle?: string | null) {
  if (!productHandle) return null;

  const query = `
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        handle
        title
        availableForSale
        variants(first: 20) {
          edges {
            node {
              id
              availableForSale
              quantityAvailable
            }
          }
        }
      }
    }
  `;

  const json = await shopifyFetch(query, { handle: productHandle });

  const variants =
    json?.data?.product?.variants?.edges
      ?.map((edge: any) => edge?.node)
      ?.filter(Boolean) ?? [];

  const available =
    variants.find((v: any) => v.availableForSale && v.id) ??
    variants.find((v: any) => v.id) ??
    null;

  return available?.id ?? null;
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
            subtotalAmount { amount currencyCode }
            totalAmount { amount currencyCode }
          }
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                attributes { key value }
                cost {
                  amountPerQuantity { amount currencyCode }
                  totalAmount { amount currencyCode }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    image { url altText }
                    product { handle title }
                  }
                }
              }
            }
          }
        }
        userErrors { field message }
      }
    }
  `;

  const json = await shopifyFetch(mutation, {
    cartId,
    lines: [
      {
        merchandiseId,
        quantity,
        attributes: imageUrl ? [{ key: "_imageUrl", value: imageUrl }] : [],
      },
    ],
  });

  return json?.data?.cartLinesAdd;
}

function isDeadVariantError(payload: any) {
  const message = payload?.userErrors
    ?.map((item: any) => item?.message || "")
    ?.join(" ")
    ?.toLowerCase();

  return (
    message?.includes("does not exist") ||
    message?.includes("não existe") ||
    message?.includes("not exist") ||
    message?.includes("invalid")
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const cartId = String(body.cartId || "").trim();
    const quantity = Math.max(1, Number(body.quantity || 1));
    const productHandle =
      typeof body.productHandle === "string" ? body.productHandle.trim() : null;

    const imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;

    let merchandiseId = normalizeVariantId(body.merchandiseId);

    if (!cartId) {
      return NextResponse.json({ ok: false, error: "Missing cartId" }, { status: 400 });
    }

    if (!merchandiseId && productHandle) {
      merchandiseId = await findCurrentVariantByHandle(productHandle);
    }

    if (!merchandiseId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Dieses Produkt ist aktuell nicht bestellbar. Die Shopify-Variante wurde nicht gefunden.",
        },
        { status: 400 }
      );
    }

    let payload = await tryCartLinesAdd(cartId, merchandiseId, quantity, imageUrl);

    if (payload?.userErrors?.length && isDeadVariantError(payload) && productHandle) {
      const freshVariantId = await findCurrentVariantByHandle(productHandle);

      if (freshVariantId && freshVariantId !== merchandiseId) {
        payload = await tryCartLinesAdd(cartId, freshVariantId, quantity, imageUrl);
      }
    }

    if (payload?.userErrors?.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Dieses Produkt ist aktuell nicht bestellbar. Bitte wähle ein anderes Produkt.",
          userErrors: payload.userErrors,
        },
        { status: 400 }
      );
    }

    if (!payload?.cart) {
      return NextResponse.json(
        { ok: false, error: "Produkt konnte nicht zum Warenkorb hinzugefügt werden." },
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
        error:
          error instanceof Error
            ? error.message
            : "Produkt konnte nicht zum Warenkorb hinzugefügt werden.",
      },
      { status: 500 }
    );
  }
}