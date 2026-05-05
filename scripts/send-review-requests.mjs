import "dotenv/config";
import crypto from "node:crypto";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_ADMIN_API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "IUMATEC Schweiz <support@iumatec.ch>";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://iumatec.ch";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SHOPIFY_STORE_DOMAIN) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
  throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
}
if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const resend = new Resend(RESEND_API_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

async function shopifyAdmin(query, variables = {}) {
  const res = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(`Shopify HTTP ${res.status}: ${JSON.stringify(json)}`);
  }

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(" | "));
  }

  return json.data;
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

async function getOrdersForReview() {
  const sevenDaysAgo = getDateDaysAgo(7);

  const query = `
    query OrdersForReview($query: String!) {
      orders(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          name
          createdAt
          email
          customer {
            email
            firstName
          }
          lineItems(first: 10) {
            nodes {
              title
              product {
                handle
                title
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyAdmin(query, {
    query: `created_at:<${sevenDaysAgo} financial_status:paid`,
  });

  return data.orders.nodes || [];
}

async function orderAlreadySent(orderId) {
  const { data, error } = await supabase
    .from("review_requests")
    .select("id")
    .eq("order_id", orderId)
    .limit(1);

  if (error) {
    throw new Error(`Supabase orderAlreadySent error: ${error.message}`);
  }

  return Array.isArray(data) && data.length > 0;
}

async function saveReviewRequests(requests) {
  if (!requests.length) return;

  const { error } = await supabase.from("review_requests").insert(requests);

  if (error) {
    throw new Error(`Supabase saveReviewRequests error: ${error.message}`);
  }
}

function buildEmailHtml({ firstName, orderName, products }) {
  const productLinks = products
    .map((product) => {
      return `
        <li style="margin-bottom:18px;">
          <strong>${product.title}</strong><br/>
          <a href="${product.reviewUrl}" style="display:inline-block;margin-top:8px;background:#c9352b;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:12px;font-weight:bold;">
            Bewertung abgeben
          </a>
          <br/>
          <a href="${product.productUrl}" style="display:inline-block;margin-top:8px;color:#666;font-size:13px;">
            Produkt ansehen
          </a>
        </li>
      `;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#111;">
      <h1 style="font-size:26px;margin-bottom:12px;">
        Wie zufrieden bist du mit deiner Bestellung?
      </h1>

      <p style="font-size:16px;line-height:1.6;">
        Hallo ${firstName || "geschätzter Kunde"},
      </p>

      <p style="font-size:16px;line-height:1.6;">
        vielen Dank für deine Bestellung ${orderName} bei <strong>IUMATEC Schweiz</strong>.
        Wir würden uns sehr über deine ehrliche Bewertung freuen.
      </p>

      <div style="background:#f7f7f7;border-radius:16px;padding:20px;margin:24px 0;">
        <ul style="padding-left:20px;margin:0;">
          ${productLinks}
        </ul>
      </div>

      <p style="font-size:14px;color:#666;line-height:1.6;">
        Deine Bewertung hilft anderen Kunden bei der Entscheidung und hilft uns,
        unseren Service weiter zu verbessern.
      </p>

      <p style="font-size:14px;color:#666;">
        Freundliche Grüsse<br/>
        IUMATEC Schweiz
      </p>
    </div>
  `;
}

async function sendReviewEmail(order) {
  const email = order.email || order.customer?.email;
  if (!email) return { skipped: true, reason: "missing-email" };

  const firstName = order.customer?.firstName || "";

  const requestsToSave = [];

  const products = (order.lineItems?.nodes || [])
    .map((item) => ({
      title: item.product?.title || item.title,
      handle: item.product?.handle,
    }))
    .filter((item) => item.handle)
    .map((item) => {
      const token = createToken();

      requestsToSave.push({
        token,
        product_slug: item.handle,
        order_id: order.id,
        order_name: order.name,
        email,
        sent_at: new Date().toISOString(),
      });

      return {
        ...item,
        reviewUrl: `${SITE_URL}/review?product=${item.handle}&token=${token}`,
        productUrl: `${SITE_URL}/produkte/${item.handle}`,
      };
    });

  if (!products.length) {
    return { skipped: true, reason: "missing-products" };
  }

  await saveReviewRequests(requestsToSave);

  await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: email,
    subject: `Bewertung zu deiner Bestellung ${order.name}`,
    html: buildEmailHtml({
      firstName,
      orderName: order.name,
      products,
    }),
  });

  return { skipped: false };
}

async function main() {
  const orders = await getOrdersForReview();

  let sent = 0;
  let skipped = 0;

  for (const order of orders) {
    const alreadySent = await orderAlreadySent(order.id);

    if (alreadySent) {
      console.log(`Skipping ${order.name} - already sent`);
      skipped++;
      continue;
    }

    console.log(`Checking ${order.name}`);

    const result = await sendReviewEmail(order);

    if (result.skipped) {
      console.log(`- skipped: ${result.reason}`);
      skipped++;
      continue;
    }

    console.log("- sent");
    sent++;
  }

  console.log("DONE");
  console.log({ sent, skipped });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});