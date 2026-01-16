// app/api/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getCheckoutItemsByIds } from "@/lib/shopify";

type CheckoutItemInput = {
  id: string; // Shopify GID (real) OU id temporário
  quantity: number;
  title?: string; // usado no modo temporário
  price?: number; // usado no modo temporário (CHF)
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const FREE_SHIPPING_THRESHOLD_CHF = 50;
const STANDARD_SHIPPING_CHF = 9.9;

// Helpers
function isShopifyGid(id: string) {
  return typeof id === "string" && id.startsWith("gid://shopify/");
}

function safeTitle(input: unknown) {
  const t = typeof input === "string" ? input.trim() : "";
  return t.length ? t.slice(0, 120) : "Artikel";
}

function safePriceCHF(input: unknown) {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) return null;
  // limites anti-abuso (modo temporário)
  if (n <= 0 || n > 50000) return null;
  return Math.round(n * 100) / 100;
}

export async function POST(req: Request) {
  try {
    // -------------------------------------------------------
    // 1) AUTH via Bearer token (Supabase access_token)
    // -------------------------------------------------------
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;
    const email = userData.user.email ?? undefined;

    // -------------------------------------------------------
    // 2) BODY + SANITIZE
    // -------------------------------------------------------
    const body = await req.json().catch(() => null);
    const items: CheckoutItemInput[] = body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    }

    const sanitized = items
      .map((it) => ({
        id: String(it?.id || "").trim(),
        quantity: Math.max(1, Math.min(99, Number(it?.quantity) || 1)),
        title: it?.title,
        price: it?.price,
      }))
      .filter((it) => it.id.length > 0);

    if (sanitized.length === 0) {
      return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
    }

    const allAreShopify = sanitized.every((it) => isShopifyGid(it.id));

    // -------------------------------------------------------
    // 3) LINE ITEMS (2 MODOS)
    //    A) Shopify-validado (quando IDs são GID)
    //    B) Temporário (usa title/price do client)
    // -------------------------------------------------------
    let subtotalCHF = 0;

    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (allAreShopify) {
      const ids = sanitized.map((it) => it.id);
      const shopifyMap = await getCheckoutItemsByIds(ids);

      line_items = sanitized.map((it) => {
        const fromShopify = shopifyMap.get(it.id);
        if (!fromShopify) {
          throw new Error(`Product not found in Shopify for id: ${it.id}`);
        }

        if ((fromShopify.currencyCode || "").toUpperCase() !== "CHF") {
          throw new Error(
            `Invalid currency for ${it.id}: ${fromShopify.currencyCode} (expected CHF)`
          );
        }

        const unitAmountCents = Math.round(fromShopify.amount * 100);
        subtotalCHF += fromShopify.amount * it.quantity;

        return {
          quantity: it.quantity,
          price_data: {
            currency: "chf",
            product_data: { name: fromShopify.title },
            unit_amount: unitAmountCents,
          },
        };
      });
    } else {
      // Modo temporário: permite testar checkout sem Shopify IDs reais
      line_items = sanitized.map((it) => {
        const title = safeTitle(it.title);
        const priceCHF = safePriceCHF(it.price);
        if (priceCHF === null) {
          throw new Error(`Invalid price for temp item: ${it.id}`);
        }

        subtotalCHF += priceCHF * it.quantity;

        return {
          quantity: it.quantity,
          price_data: {
            currency: "chf",
            product_data: { name: title },
            unit_amount: Math.round(priceCHF * 100),
          },
        };
      });
    }

    // -------------------------------------------------------
    // 4) SHIPPING (CH-only)
    // -------------------------------------------------------
    const isFreeShipping = subtotalCHF >= FREE_SHIPPING_THRESHOLD_CHF;

    const shipping_options: Stripe.Checkout.SessionCreateParams.ShippingOption[] =
      isFreeShipping
        ? [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: 0, currency: "chf" },
                display_name: `Gratis Versand (ab CHF ${FREE_SHIPPING_THRESHOLD_CHF.toFixed(0)})`,
                delivery_estimate: {
                  minimum: { unit: "business_day", value: 1 },
                  maximum: { unit: "business_day", value: 3 },
                },
              },
            },
          ]
        : [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: Math.round(STANDARD_SHIPPING_CHF * 100), currency: "chf" },
                display_name: "Standardversand (CH)",
                delivery_estimate: {
                  minimum: { unit: "business_day", value: 1 },
                  maximum: { unit: "business_day", value: 3 },
                },
              },
            },
          ];

    // -------------------------------------------------------
    // 5) CREATE STRIPE CHECKOUT SESSION
    // -------------------------------------------------------
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://iumatec.ch";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,

      shipping_address_collection: { allowed_countries: ["CH"] },
      shipping_options,

      success_url: `${siteUrl}/account/orders?success=1`,
      cancel_url: `${siteUrl}/cart?canceled=1`,

      // para o webhook gravar a order ligada ao user
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        cart_mode: allAreShopify ? "shopify_validated" : "temp",
        shipping_rule: isFreeShipping ? "free_over_50" : "standard",
        subtotal_chf: subtotalCHF.toFixed(2),
      },

      customer_email: email,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("Stripe checkout create error:", err);
    return NextResponse.json(
      { error: "Checkout konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
