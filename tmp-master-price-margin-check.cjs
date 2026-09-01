const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function loadEnv(file) {
  if (!fs.existsSync(file)) return;

  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();

    if (!line || line.startsWith("#")) continue;

    const p = line.indexOf("=");

    if (p < 1) continue;

    const key = line.slice(0, p).trim();
    let value = line.slice(p + 1).trim();

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

const VAT = 0.081;
const PAYMENT_RATE = 0.0315;
const PAYMENT_FIXED = 0.35;

const SUPPLIER_SHIPPING_GROSS = 5.90;
const CUSTOMER_SHIPPING_GROSS = 9.90;
const FREE_SHIPPING_FROM = 49;

const MIN_MARGIN = 0.10;
const MIN_PROFIT = 2.00;

const PAGE = 1000;

function n(v) {
  const x = Number(
    String(v ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(x) ? x : 0;
}

function key(v) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/^LITM\s*:\s*/, "")
    .replace(/\s+/g, " ");
}

function validVariant(v) {
  return String(v || "")
    .startsWith("gid://shopify/ProductVariant/");
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
    SUPPLIER_SHIPPING_GROSS /
    (1 + VAT);

  const fee =
    collected * PAYMENT_RATE +
    PAYMENT_FIXED;

  const profit =
    revenueNet -
    costNet -
    supplierShippingNet -
    fee;

  const margin =
    revenueNet > 0
      ? profit / revenueNet
      : 0;

  return {
    profit,
    margin
  };
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function getSupabase() {

  const rows = [];

  for (
    let from = 0;
    ;
    from += PAGE
  ) {

    const to =
      from + PAGE - 1;

    const url =
      `${SUPABASE_URL}/rest/v1/products` +
      `?select=catalog_key,sku,price,stock_qty,shopify_variant_id,merchandise_id` +
      `&order=catalog_key.asc`;

    const res = await fetch(url, {
      headers: headers({
        Range: `${from}-${to}`
      })
    });

    if (!res.ok) {
      throw new Error(
        `Supabase HTTP ${res.status}: ` +
        await res.text()
      );
    }

    const batch =
      await res.json();

    rows.push(...batch);

    console.log(
      `Supabase lido: ${rows.length}`
    );

    if (batch.length < PAGE) break;
  }

  return rows;
}

(async () => {

  console.log("");
  console.log("==============================================");
  console.log(" SIMULAR MARGEM COM PRECO NOVO DO MASTER");
  console.log("==============================================");
  console.log("");
  console.log("READ ONLY");
  console.log("NADA SERA ALTERADO");
  console.log("");

  const master =
    JSON.parse(
      fs.readFileSync(
        MASTER_PATH,
        "utf8"
      ).replace(/^\uFEFF/, "")
    );

  const idx =
    new Map();

  for (const p of master) {

    const k =
      key(
        p.litm ??
        p.alltronSku
      );

    if (
      k &&
      !idx.has(k)
    ) {
      idx.set(k, p);
    }
  }

  const supabase =
    await getSupabase();

  let linked = 0;
  let analyzed = 0;

  let different = 0;
  let same = 0;

  let masterZero = 0;
  let missingMaster = 0;
  let missingCost = 0;

  let currentBad = 0;
  let masterBad = 0;

  let fixedByMaster = 0;
  let stillBad = 0;

  let lossWithMaster = 0;

  const bad = [];

  for (const row of supabase) {

    const variant =
      row.shopify_variant_id ||
      row.merchandise_id ||
      "";

    if (!validVariant(variant)) {
      continue;
    }

    const stock =
      n(row.stock_qty);

    const currentPrice =
      n(row.price);

    if (
      stock <= 0 ||
      currentPrice <= 0
    ) {
      continue;
    }

    linked++;

    const k =
      key(row.catalog_key);

    const p =
      idx.get(k);

    if (!p) {
      missingMaster++;
      continue;
    }

    const masterPrice =
      n(p.price);

    if (!(masterPrice > 0)) {
      masterZero++;
      continue;
    }

    const cost =
      n(p.expr);

    if (!(cost > 0)) {
      missingCost++;
      continue;
    }

    analyzed++;

    if (
      Math.abs(
        currentPrice -
        masterPrice
      ) > 0.01
    ) {
      different++;
    }
    else {
      same++;
    }

    const now =
      calc(
        currentPrice,
        cost
      );

    const next =
      calc(
        masterPrice,
        cost
      );

    const nowBad =
      now.margin < MIN_MARGIN ||
      now.profit < MIN_PROFIT;

    const nextBad =
      next.margin < MIN_MARGIN ||
      next.profit < MIN_PROFIT;

    if (nowBad) {
      currentBad++;
    }

    if (nextBad) {
      masterBad++;
    }

    if (
      nowBad &&
      !nextBad
    ) {
      fixedByMaster++;
    }

    if (nextBad) {

      stillBad++;

      if (next.profit < 0) {
        lossWithMaster++;
      }

      bad.push({
        litm: k,
        sku: row.sku,

        currentPrice:
          Number(
            currentPrice.toFixed(2)
          ),

        masterPrice:
          Number(
            masterPrice.toFixed(2)
          ),

        expr:
          Number(
            cost.toFixed(2)
          ),

        profitMaster:
          Number(
            next.profit.toFixed(2)
          ),

        marginMaster:
          Number(
            (
              next.margin * 100
            ).toFixed(2)
          )
      });
    }
  }

  bad.sort(
    (a, b) =>
      a.marginMaster -
      b.marginMaster
  );

  console.log("");
  console.log("==============================================");
  console.log(" RESULTADO");
  console.log("==============================================");
  console.log("");

  console.log(
    "Ligados + stock                :",
    linked
  );

  console.log(
    "Analisados                     :",
    analyzed
  );

  console.log("");
  console.log(
    "Preco atual = master           :",
    same
  );

  console.log(
    "Preco atual != master          :",
    different
  );

  console.log("");
  console.log(
    "Sem master                     :",
    missingMaster
  );

  console.log(
    "Master price = 0               :",
    masterZero
  );

  console.log(
    "Sem EXPR                       :",
    missingCost
  );

  console.log("");
  console.log(
    "Ruins com preco ATUAL          :",
    currentBad
  );

  console.log(
    "Resolvidos usando master       :",
    fixedByMaster
  );

  console.log(
    "Ainda ruins com preco MASTER   :",
    stillBad
  );

  console.log(
    "Prejuizo mesmo com master      :",
    lossWithMaster
  );

  console.log("");
  console.log(
    "===== PIORES QUE CONTINUARIAM RUINS ====="
  );

  console.table(
    bad.slice(0, 30)
  );

  console.log("");
  console.log("==============================================");
  console.log(" SIMULACAO TERMINADA");
  console.log("==============================================");
  console.log("");
  console.log("NADA FOI ALTERADO.");
  console.log("");

})().catch(error => {

  console.error("");
  console.error(
    "ERRO:",
    error.message
  );

  process.exit(1);
});
