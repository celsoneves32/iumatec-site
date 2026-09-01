const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function loadEnv(file) {
  if (!fs.existsSync(file)) return;

  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();

    if (!line || line.startsWith("#")) continue;

    const pos = line.indexOf("=");

    if (pos < 1) continue;

    const key = line.slice(0, pos).trim();
    let value = line.slice(pos + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const SUPABASE_URL = String(
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).trim().replace(/\/$/, "");

const SUPABASE_KEY = String(
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ""
).trim();

const MASTER_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json"
);

const PAGE_SIZE = 1000;

const VAT = 0.081;
const PAYMENT_RATE = 0.0315;
const PAYMENT_FIXED = 0.35;
const SUPPLIER_SHIPPING_GROSS = 5.90;
const CUSTOMER_SHIPPING_GROSS = 9.90;
const FREE_SHIPPING_FROM = 49;

function n(v) {
  const x = Number(
    String(v ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(x) ? x : 0;
}

function norm(v) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function keyOf(v) {
  return norm(v)
    .replace(/^LITM\s*:\s*/, "");
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

function calc(price, costNet) {

  const customerShipping =
    price < FREE_SHIPPING_FROM
      ? CUSTOMER_SHIPPING_GROSS
      : 0;

  const collected =
    price + customerShipping;

  const revenueNet =
    collected / (1 + VAT);

  const supplierShippingNet =
    SUPPLIER_SHIPPING_GROSS / (1 + VAT);

  const paymentFee =
    collected * PAYMENT_RATE +
    PAYMENT_FIXED;

  const profit =
    revenueNet -
    costNet -
    supplierShippingNet -
    paymentFee;

  const margin =
    revenueNet > 0
      ? profit / revenueNet
      : 0;

  return {
    profit,
    margin
  };
}

async function getSupabase() {

  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {

    const to =
      from + PAGE_SIZE - 1;

    const url =
      `${SUPABASE_URL}/rest/v1/products` +
      `?select=catalog_key,sku,price,stock_qty,shopify_variant_id,merchandise_id` +
      `&order=catalog_key.asc`;

    const response =
      await fetch(url, {
        headers: headers({
          Range: `${from}-${to}`
        })
      });

    if (!response.ok) {
      throw new Error(
        `Supabase ${response.status}: ` +
        await response.text()
      );
    }

    const batch =
      await response.json();

    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

(async () => {

  console.log("");
  console.log("==============================================");
  console.log(" INVESTIGAR OS PIORES PRODUTOS DE MARGEM");
  console.log("==============================================");
  console.log("");
  console.log("READ ONLY - NADA SERA ALTERADO");
  console.log("");

  const master =
    JSON.parse(
      fs.readFileSync(MASTER_PATH, "utf8")
        .replace(/^\uFEFF/, "")
    );

  const masterIndex =
    new Map();

  for (const p of master) {

    const key =
      keyOf(
        p.litm ??
        p.alltronSku
      );

    if (key && !masterIndex.has(key)) {
      masterIndex.set(key, p);
    }
  }

  const rows =
    await getSupabase();

  const results = [];

  for (const row of rows) {

    const variant =
      String(
        row.shopify_variant_id ||
        row.merchandise_id ||
        ""
      );

    if (
      !variant.startsWith(
        "gid://shopify/ProductVariant/"
      )
    ) {
      continue;
    }

    const price =
      n(row.price);

    const stock =
      n(row.stock_qty);

    if (
      price <= 0 ||
      stock <= 0
    ) {
      continue;
    }

    const litm =
      keyOf(row.catalog_key);

    const p =
      masterIndex.get(litm);

    if (!p) continue;

    const expr =
      n(p.expr);

    if (!(expr > 0)) continue;

    const f =
      calc(price, expr);

    results.push({
      litm,
      sku: row.sku,

      supPrice:
        Number(price.toFixed(2)),

      masterPrice:
        Number(n(p.price).toFixed(2)),

      ecpr:
        Number(n(p.ecpr).toFixed(2)),

      expr:
        Number(expr.toFixed(2)),

      inpr:
        Number(n(p.inpr).toFixed(2)),

      supStock:
        stock,

      masterStock:
        n(p.stockQty ?? p.stock),

      profit:
        Number(f.profit.toFixed(2)),

      marginPct:
        Number(
          (f.margin * 100).toFixed(2)
        )
    });
  }

  results.sort(
    (a, b) =>
      a.marginPct - b.marginPct
  );

  console.log(
    "Produtos comparados:",
    results.length
  );

  console.log("");
  console.log(
    "===== 30 PIORES ====="
  );

  console.table(
    results.slice(0, 30)
  );

  let priceDifferent = 0;
  let exprAboveSelling = 0;

  for (const r of results) {

    if (
      Math.abs(
        r.supPrice -
        r.masterPrice
      ) > 0.01
    ) {
      priceDifferent++;
    }

    if (
      r.expr >
      r.supPrice
    ) {
      exprAboveSelling++;
    }
  }

  console.log("");
  console.log("==============================================");
  console.log(" DIAGNOSTICO");
  console.log("==============================================");

  console.log(
    "Supabase price != master price :",
    priceDifferent
  );

  console.log(
    "EXPR > preco de venda          :",
    exprAboveSelling
  );

  console.log("");
  console.log(
    "NADA FOI ALTERADO."
  );

})().catch(error => {

  console.error("");
  console.error(
    "ERRO:",
    error.message
  );

  process.exit(1);
});
