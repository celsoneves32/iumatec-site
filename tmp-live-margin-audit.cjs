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

const VAT = 0.081;

const PAYMENT_RATE = 0.0315;
const PAYMENT_FIXED = 0.35;

const SUPPLIER_SHIPPING_GROSS = 5.90;
const CUSTOMER_SHIPPING_GROSS = 9.90;
const FREE_SHIPPING_FROM = 49;

const MIN_MARGIN = 0.10;
const MIN_PROFIT = 2.00;

const PAGE_SIZE = 1000;

function num(v) {
  if (v === null || v === undefined || v === "") return 0;

  const x = Number(
    String(v)
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

function catalogKey(v) {
  return norm(v)
    .replace(/^LITM\s*:\s*/, "");
}

function validVariant(v) {
  return String(v || "")
    .trim()
    .startsWith("gid://shopify/ProductVariant/");
}

function purchaseCostNet(p) {
  const expr = num(p.expr);

  if (expr > 0) {
    return {
      value: expr,
      source: "EXPR"
    };
  }

  const inpr = num(p.inpr);

  if (inpr > 0) {
    return {
      value: inpr / (1 + VAT),
      source: "INPR"
    };
  }

  return {
    value: 0,
    source: "MISSING"
  };
}

function financials(price, costNet) {

  const customerShipping =
    price < FREE_SHIPPING_FROM
      ? CUSTOMER_SHIPPING_GROSS
      : 0;

  const grossCollected =
    price + customerShipping;

  const netRevenue =
    grossCollected / (1 + VAT);

  const supplierShippingNet =
    SUPPLIER_SHIPPING_GROSS /
    (1 + VAT);

  const paymentFee =
    grossCollected * PAYMENT_RATE +
    PAYMENT_FIXED;

  const profit =
    netRevenue -
    costNet -
    supplierShippingNet -
    paymentFee;

  const margin =
    netRevenue > 0
      ? profit / netRevenue
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

async function fetchSupabase() {

  const rows = [];

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {

    const to =
      from + PAGE_SIZE - 1;

    const endpoint =
      `${SUPABASE_URL}/rest/v1/products` +
      `?select=catalog_key,sku,price,stock_qty,in_stock,shopify_variant_id,merchandise_id` +
      `&order=catalog_key.asc`;

    const response =
      await fetch(
        endpoint,
        {
          headers: headers({
            Range: `${from}-${to}`,
            Prefer: "count=exact"
          })
        }
      );

    if (!response.ok) {
      throw new Error(
        `Supabase HTTP ${response.status}: ` +
        (await response.text()).slice(0, 1000)
      );
    }

    const batch =
      await response.json();

    rows.push(...batch);

    console.log(
      `Supabase lido: ${rows.length}`
    );

    if (batch.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

(async () => {

  console.log("");
  console.log("================================================");
  console.log(" AUDITORIA REAL DA LOJA IUMATEC");
  console.log("================================================");
  console.log("");
  console.log("READ ONLY");
  console.log("SHOPIFY NAO SERA ALTERADA");
  console.log("SUPABASE NAO SERA ALTERADO");
  console.log("");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Credenciais Supabase nao encontradas."
    );
  }

  if (!fs.existsSync(MASTER_PATH)) {
    throw new Error(
      "Master catalog nao encontrado."
    );
  }

  const master =
    JSON.parse(
      fs.readFileSync(
        MASTER_PATH,
        "utf8"
      ).replace(/^\uFEFF/, "")
    );

  if (!Array.isArray(master)) {
    throw new Error(
      "Master nao e array."
    );
  }

  console.log(
    `Master: ${master.length}`
  );

  console.log("");
  console.log(
    "A carregar os produtos reais do Supabase..."
  );

  const supabase =
    await fetchSupabase();

  console.log("");
  console.log(
    `Supabase total: ${supabase.length}`
  );

  // ========================================================
  // INDEXAR MASTER PELO LITM
  // ========================================================

  const masterIndex =
    new Map();

  const duplicateKeys =
    new Set();

  for (const p of master) {

    const key =
      catalogKey(
        p.litm ??
        p.alltronSku
      );

    if (!key) continue;

    if (masterIndex.has(key)) {
      duplicateKeys.add(key);
      continue;
    }

    masterIndex.set(
      key,
      p
    );
  }

  console.log(
    `Master LITMs indexados: ${masterIndex.size}`
  );

  console.log(
    `LITMs duplicados master: ${duplicateKeys.size}`
  );

  // ========================================================
  // CONTADORES
  // ========================================================

  let linkedShopify = 0;
  let activeStock = 0;
  let analyzed = 0;

  let missingMaster = 0;
  let missingCost = 0;

  let losses = 0;
  let below5 = 0;
  let from5to10 = 0;
  let from10to15 = 0;
  let above15 = 0;

  let badTotal = 0;

  const bands = {
    under49: {
      total: 0,
      bad: 0
    },

    from49to60: {
      total: 0,
      bad: 0
    },

    from60to100: {
      total: 0,
      bad: 0
    },

    over100: {
      total: 0,
      bad: 0
    }
  };

  const worst = [];

  // ========================================================
  // ANALISAR APENAS CATÁLOGO REAL
  // ========================================================

  for (const row of supabase) {

    const variant =
      row.shopify_variant_id ||
      row.merchandise_id ||
      "";

    if (!validVariant(variant)) {
      continue;
    }

    linkedShopify++;

    const stock =
      num(row.stock_qty);

    const price =
      num(row.price);

    if (
      stock <= 0 ||
      price <= 0
    ) {
      continue;
    }

    activeStock++;

    const key =
      catalogKey(
        row.catalog_key
      );

    const p =
      masterIndex.get(key);

    if (!p) {

      missingMaster++;

      continue;
    }

    const cost =
      purchaseCostNet(p);

    if (!(cost.value > 0)) {

      missingCost++;

      continue;
    }

    analyzed++;

    const f =
      financials(
        price,
        cost.value
      );

    const marginPct =
      f.margin * 100;

    if (f.profit < 0) {
      losses++;
    }

    if (marginPct < 5) {
      below5++;
    }
    else if (marginPct < 10) {
      from5to10++;
    }
    else if (marginPct < 15) {
      from10to15++;
    }
    else {
      above15++;
    }

    const bad =
      f.margin < MIN_MARGIN ||
      f.profit < MIN_PROFIT;

    if (bad) {
      badTotal++;
    }

    let band;

    if (price < 49) {
      band = bands.under49;
    }
    else if (price < 60) {
      band = bands.from49to60;
    }
    else if (price < 100) {
      band = bands.from60to100;
    }
    else {
      band = bands.over100;
    }

    band.total++;

    if (bad) {
      band.bad++;
    }

    if (bad) {

      worst.push({
        litm: key,
        sku: row.sku,
        stock,
        price:
          Number(price.toFixed(2)),
        costNet:
          Number(
            cost.value.toFixed(2)
          ),
        costSource:
          cost.source,
        profit:
          Number(
            f.profit.toFixed(2)
          ),
        marginPct:
          Number(
            marginPct.toFixed(2)
          )
      });
    }
  }

  worst.sort(
    (a, b) =>
      a.marginPct - b.marginPct
  );

  console.log("");
  console.log("================================================");
  console.log(" RESULTADO - LOJA REAL");
  console.log("================================================");
  console.log("");

  console.log(
    "Supabase total                 :",
    supabase.length
  );

  console.log(
    "Ligados a Shopify              :",
    linkedShopify
  );

  console.log(
    "Ligados + stock > 0            :",
    activeStock
  );

  console.log(
    "Financeiramente analisados     :",
    analyzed
  );

  console.log(
    "Nao encontrados no master      :",
    missingMaster
  );

  console.log(
    "Sem custo valido               :",
    missingCost
  );

  console.log("");
  console.log(
    "Com prejuizo                   :",
    losses
  );

  console.log(
    "Margem < 5%                    :",
    below5
  );

  console.log(
    "Margem 5% ate <10%             :",
    from5to10
  );

  console.log(
    "Margem 10% ate <15%            :",
    from10to15
  );

  console.log(
    "Margem >=15%                   :",
    above15
  );

  console.log("");
  console.log(
    "TOTAL REAL A CORRIGIR          :",
    badTotal
  );

  console.log("");
  console.log(
    "===== FAIXAS DE PRECO ====="
  );

  console.log(
    "< CHF 49       :",
    bands.under49.total,
    "| corrigir:",
    bands.under49.bad
  );

  console.log(
    "CHF 49 - 59.99 :",
    bands.from49to60.total,
    "| corrigir:",
    bands.from49to60.bad
  );

  console.log(
    "CHF 60 - 99.99 :",
    bands.from60to100.total,
    "| corrigir:",
    bands.from60to100.bad
  );

  console.log(
    ">= CHF 100     :",
    bands.over100.total,
    "| corrigir:",
    bands.over100.bad
  );

  console.log("");
  console.log(
    "===== 20 PIORES DA LOJA REAL ====="
  );

  console.table(
    worst.slice(0, 20)
  );

  console.log("");
  console.log("================================================");
  console.log(" AUDITORIA TERMINADA");
  console.log("================================================");
  console.log("");
  console.log("NADA FOI ALTERADO.");
  console.log("");

})().catch(error => {

  console.error("");
  console.error("ERRO:", error.message);
  process.exit(1);

});
