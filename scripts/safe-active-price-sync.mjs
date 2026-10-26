import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);

const APPLY =
  ARGS.includes("--apply");

const CONFIRM =
  (
    ARGS.find(x =>
      x.startsWith("--confirm=")
    ) || ""
  ).slice("--confirm=".length);

const REQUIRED_CONFIRM =
  "IUMATEC-SAFE-ACTIVE-PRICE";

if (
  APPLY &&
  CONFIRM !== REQUIRED_CONFIRM
) {
  throw new Error(
    `APPLY requires --confirm=${REQUIRED_CONFIRM}`
  );
}

const MASTER_FILE = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json"
);

const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "safe-active-price-sync"
);

const REPORT_FILE = path.join(
  OUT_DIR,
  "latest.json"
);

const PAGE_SIZE = 1000;
const PRICE_TOLERANCE = 0.009;

/*
  Mesma filosofia de segurança já usada
  no projeto: saltos > 50% não são
  aplicados automaticamente.
*/
const MAX_INCREASE_RATIO = 1.50;

const MIN_ACTIVE_ROWS = 30000;
const MAX_ACTIVE_ROWS = 60000;

const MIN_IDENTITY_RATIO = 0.995;

const MAX_QUARANTINE = 2000;

const MAX_PRICE_INCREASES = 10000;
const MAX_PRICE_INCREASE_RATIO = 0.30;

const supabaseUrl = String(
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).trim().replace(/\/$/, "");

const supabaseKey = String(
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ""
).trim();

const shopifyDomain = String(
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
  ""
).trim();

const shopifyToken = String(
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
  ""
).trim();

const shopifyVersion = String(
  process.env.SHOPIFY_ADMIN_API_VERSION ||
  process.env.SHOPIFY_API_VERSION ||
  "2026-07"
).trim();

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL");
}

if (!supabaseKey) {
  throw new Error("Missing Supabase key");
}

if (!shopifyDomain) {
  throw new Error(
    "Missing SHOPIFY_STORE_DOMAIN"
  );
}

if (!shopifyToken) {
  throw new Error(
    "Missing SHOPIFY_ADMIN_ACCESS_TOKEN"
  );
}

if (!fs.existsSync(MASTER_FILE)) {
  throw new Error(
    "Master catalog not found"
  );
}

fs.mkdirSync(
  OUT_DIR,
  { recursive: true }
);

function text(v) {
  return String(v ?? "").trim();
}

function norm(v) {
  return text(v)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normLitm(v) {
  return norm(v)
    .replace(/^LITM\s*:\s*/, "")
    .trim();
}

function normEan(v) {

  const raw = text(v);

  const digits =
    raw.replace(/\D/g, "");

  return digits.length >= 8
    ? digits
    : norm(raw);
}

function money(v) {

  const n = Number(v);

  if (!Number.isFinite(n)) {
    return null;
  }

  return Number(
    n.toFixed(2)
  );
}

function variantId(row) {

  const raw = text(
    row?.merchandise_id ||
    row?.shopify_variant_id
  );

  if (
    /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(
      raw
    )
  ) {
    return raw;
  }

  const numeric =
    raw.match(/(\d+)$/)?.[1] || "";

  return numeric
    ? `gid://shopify/ProductVariant/${numeric}`
    : "";
}

function isActive(row) {

  return (
    Number(row?.stock_qty || 0) > 0 ||
    row?.in_stock === true
  );
}

function masterInternal(row) {

  return norm(
    row?.internalNumber ||
    row?.internal_number ||
    ""
  );
}

function supabaseHeaders(extra = {}) {

  const result = {
    apikey: supabaseKey,
    "Content-Type": "application/json",
    ...extra
  };

  if (supabaseKey.startsWith("eyJ")) {
    result.Authorization =
      `Bearer ${supabaseKey}`;
  }

  return result;
}

async function sleep(ms) {

  await new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

async function fetchAllSupabase() {

  const rows = [];

  for (
    let from = 0;
    ;
    from += PAGE_SIZE
  ) {

    const fields = [
      "catalog_key",
      "sku",
      "ean",
      "internal_number",
      "price",
      "stock_qty",
      "in_stock",
      "merchandise_id",
      "shopify_variant_id",
      "original_price",
      "purchase_cost_incl_vat",
      "minimum_safe_price",
      "price_safety_status",
      "price_rule"
    ].join(",");

    const url =
      `${supabaseUrl}/rest/v1/products` +
      `?select=${encodeURIComponent(fields)}` +
      `&order=catalog_key.asc`;

    const response = await fetch(
      url,
      {
        headers: {
          ...supabaseHeaders(),
          Range:
            `${from}-${from + PAGE_SIZE - 1}`
        }
      }
    );

    if (!response.ok) {

      throw new Error(
        `Supabase GET ${response.status}: ` +
        (await response.text())
          .slice(0, 600)
      );
    }

    const batch =
      await response.json();

    rows.push(...batch);

    console.log(
      `Supabase: ${
        rows.length.toLocaleString("pt-PT")
      }`
    );

    if (batch.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function patchSupabase(
  catalogKey,
  body
) {

  const url =
    `${supabaseUrl}/rest/v1/products` +
    `?catalog_key=eq.${encodeURIComponent(
      catalogKey
    )}`;

  let lastError;

  for (
    let attempt = 1;
    attempt <= 6;
    attempt++
  ) {

    try {

      const response = await fetch(
        url,
        {
          method: "PATCH",

          headers:
            supabaseHeaders({
              Prefer:
                "return=representation"
            }),

          body:
            JSON.stringify(body)
        }
      );

      const raw =
        await response.text();

      if (!response.ok) {

        throw new Error(
          `HTTP ${response.status}: ` +
          raw.slice(0, 600)
        );
      }

      const rows =
        raw
          ? JSON.parse(raw)
          : [];

      if (
        !Array.isArray(rows) ||
        rows.length !== 1
      ) {
        throw new Error(
          `PATCH affected ${
            rows?.length ?? "?"
          } rows`
        );
      }

      return rows[0];

    }
    catch (error) {

      lastError = error;

      if (attempt < 6) {

        await sleep(
          attempt * 700
        );
      }
    }
  }

  throw lastError;
}

function addIndex(
  map,
  key,
  row
) {

  if (!key) {
    return;
  }

  const rows =
    map.get(key) || [];

  rows.push(row);

  map.set(
    key,
    rows
  );
}

function uniqueMaster(rows) {

  if (
    !rows ||
    rows.length === 0
  ) {
    return {
      status: "none",
      row: null
    };
  }

  const litms =
    new Set(
      rows
        .map(x => normLitm(x?.litm))
        .filter(Boolean)
    );

  if (litms.size !== 1) {

    return {
      status: "ambiguous",
      row: null
    };
  }

  return {
    status: "unique",
    row: rows[0]
  };
}

function buildIndexes(master) {

  const indexes = {
    litm: new Map(),
    internal: new Map(),
    ean: new Map()
  };

  for (const row of master) {

    addIndex(
      indexes.litm,
      normLitm(row?.litm),
      row
    );

    addIndex(
      indexes.internal,
      masterInternal(row),
      row
    );

    addIndex(
      indexes.ean,
      normEan(row?.ean),
      row
    );
  }

  return indexes;
}

function matchMaster(
  product,
  indexes
) {

  const catalog =
    normLitm(
      product?.catalog_key
    );

  if (catalog) {

    const result =
      uniqueMaster(
        indexes.litm.get(catalog)
      );

    if (
      result.status === "unique"
    ) {
      return {
        ...result,
        method: "catalog-key"
      };
    }

    if (
      result.status === "ambiguous"
    ) {
      return {
        status: "ambiguous",
        method: "catalog-key"
      };
    }
  }

  const internal =
    norm(
      product?.internal_number
    );

  if (internal) {

    const result =
      uniqueMaster(
        indexes.internal.get(internal)
      );

    if (
      result.status === "unique"
    ) {
      return {
        ...result,
        method: "internal-number"
      };
    }

    if (
      result.status === "ambiguous"
    ) {
      return {
        status: "ambiguous",
        method: "internal-number"
      };
    }
  }

  const ean =
    normEan(product?.ean);

  if (ean) {

    const result =
      uniqueMaster(
        indexes.ean.get(ean)
      );

    if (
      result.status === "unique"
    ) {
      return {
        ...result,
        method: "ean"
      };
    }

    if (
      result.status === "ambiguous"
    ) {
      return {
        status: "ambiguous",
        method: "ean"
      };
    }
  }

  return {
    status: "none",
    row: null,
    method: ""
  };
}

async function shopifyGraphql(
  query,
  variables
) {

  let lastError;

  for (
    let attempt = 1;
    attempt <= 8;
    attempt++
  ) {

    try {

      const response = await fetch(
        `https://${shopifyDomain}` +
        `/admin/api/${shopifyVersion}` +
        `/graphql.json`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "X-Shopify-Access-Token":
              shopifyToken
          },

          body:
            JSON.stringify({
              query,
              variables
            })
        }
      );

      const raw =
        await response.text();

      let json;

      try {
        json = JSON.parse(raw);
      }
      catch {

        throw new Error(
          `Non-JSON Shopify response: ` +
          raw.slice(0, 500)
        );
      }

      const throttled =
        json?.errors?.some(
          error =>
            error?.extensions?.code ===
            "THROTTLED"
        );

      if (throttled) {

        throw new Error(
          "SHOPIFY_THROTTLED"
        );
      }

      if (
        !response.ok ||
        json?.errors?.length
      ) {

        throw new Error(
          JSON.stringify(
            json?.errors || json
          )
        );
      }

      return json.data;

    }
    catch (error) {

      lastError = error;

      if (attempt < 8) {

        await sleep(
          attempt * 1000
        );
      }
    }
  }

  throw lastError;
}

const VARIANT_QUERY = `
query SafePriceVariants($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      price
      sku
      product {
        id
        title
        status
      }
    }
  }
}
`;

const UPDATE_MUTATION = `
mutation SafePriceIncrease(
  $productId: ID!,
  $variants: [ProductVariantsBulkInput!]!
) {
  productVariantsBulkUpdate(
    productId: $productId,
    variants: $variants
  ) {
    productVariants {
      id
      price
    }
    userErrors {
      field
      message
    }
  }
}
`;

async function readShopifyVariants(
  ids
) {

  const result = [];

  for (
    let index = 0;
    index < ids.length;
    index += 100
  ) {

    const batch =
      ids.slice(
        index,
        index + 100
      );

    const data =
      await shopifyGraphql(
        VARIANT_QUERY,
        { ids: batch }
      );

    result.push(
      ...(data?.nodes || [])
        .filter(Boolean)
    );

    console.log(
      `Shopify audit: ${
        Math.min(
          index + 100,
          ids.length
        )
      }/${ids.length}`
    );
  }

  return result;
}

async function updateShopifyPrice(
  row,
  target
) {

  const data =
    await shopifyGraphql(
      UPDATE_MUTATION,
      {
        productId:
          row.product.id,

        variants: [
          {
            id: row.id,
            price:
              target.toFixed(2)
          }
        ]
      }
    );

  const payload =
    data?.productVariantsBulkUpdate;

  const errors =
    payload?.userErrors || [];

  if (errors.length) {

    throw new Error(
      JSON.stringify(errors)
    );
  }

  const saved =
    payload
      ?.productVariants
      ?.[0];

  if (
    !saved ||
    Math.abs(
      Number(saved.price) -
      target
    ) > PRICE_TOLERANCE
  ) {

    throw new Error(
      "Shopify price verification failed"
    );
  }
}

async function runPool(
  rows,
  concurrency,
  worker
) {

  let next = 0;

  async function consume() {

    while (true) {

      const index =
        next++;

      if (
        index >= rows.length
      ) {
        return;
      }

      await worker(
        rows[index],
        index
      );
    }
  }

  await Promise.all(
    Array.from(
      {
        length:
          Math.min(
            concurrency,
            Math.max(
              rows.length,
              1
            )
          )
      },
      () => consume()
    )
  );
}

async function main() {

  console.log("");
  console.log(
    APPLY
      ? "MODE: APPLY"
      : "MODE: AUDIT - ZERO WRITES"
  );

  console.log(
    "POLICY: ACTIVE PRODUCTS ONLY"
  );

  console.log(
    "AUTOMATIC PRICE DECREASES: NEVER"
  );

  const master =
    JSON.parse(
      fs.readFileSync(
        MASTER_FILE,
        "utf8"
      )
    );

  const products =
    await fetchAllSupabase();

  const active =
    products.filter(isActive);

  const indexes =
    buildIndexes(master);

  const plans = [];

  const matchMethods = {};

  let identityMatched = 0;
  let identityUnmatched = 0;
  let identityAmbiguous = 0;
  let blockedDecrease = 0;

  const catalogCounts =
    new Map();

  for (const row of active) {

    const key =
      text(row.catalog_key);

    catalogCounts.set(
      key,
      (
        catalogCounts.get(key) ||
        0
      ) + 1
    );
  }

  const duplicateCatalogKeys =
    [
      ...catalogCounts.entries()
    ]
      .filter(
        ([key, count]) =>
          key &&
          count > 1
      )
      .map(
        ([key]) => key
      );

  for (const product of active) {

    const match =
      matchMaster(
        product,
        indexes
      );

    const plan = {
      catalogKey:
        text(product.catalog_key),

      sku:
        text(product.sku),

      variantId:
        variantId(product),

      product,

      master: null,

      matchMethod:
        match.method || "",

      action:
        "SAFE",

      reason:
        "",

      currentPrice:
        money(product.price),

      minimumSafePrice:
        null,

      targetPrice:
        null
    };

    if (
      match.status ===
      "ambiguous"
    ) {

      identityAmbiguous++;

      plan.action =
        "QUARANTINE";

      plan.reason =
        `identity-ambiguous-${
          match.method
        }`;

      plans.push(plan);

      continue;
    }

    if (
      match.status !==
        "unique" ||
      !match.row
    ) {

      identityUnmatched++;

      plan.action =
        "QUARANTINE";

      plan.reason =
        "identity-unmatched";

      plans.push(plan);

      continue;
    }

    identityMatched++;

    matchMethods[match.method] =
      (
        matchMethods[
          match.method
        ] || 0
      ) + 1;

    const wanted =
      match.row;

    plan.master =
      wanted;

    const masterPrice =
      money(wanted?.price);

    const minimumSafe =
      money(
        wanted?.minimumSafePrice
      );

    plan.minimumSafePrice =
      minimumSafe;

    if (!plan.variantId) {

      plan.action =
        "QUARANTINE";

      plan.reason =
        "missing-shopify-variant";

      plans.push(plan);

      continue;
    }

    if (
      !(plan.currentPrice > 0)
    ) {

      plan.action =
        "QUARANTINE";

      plan.reason =
        "invalid-current-price";

      plans.push(plan);

      continue;
    }

    if (
      !(masterPrice > 0) ||
      !(minimumSafe > 0)
    ) {

      plan.action =
        "QUARANTINE";

      plan.reason =
        "invalid-master-price-floor";

      plans.push(plan);

      continue;
    }

    /*
      Já cobre o mínimo seguro.
      Não baixamos e não subimos por
      razões meramente comerciais.
    */

    if (
      plan.currentPrice >=
      minimumSafe -
      PRICE_TOLERANCE
    ) {

      if (
        masterPrice <
        plan.currentPrice -
        PRICE_TOLERANCE
      ) {
        blockedDecrease++;
      }

      plan.action =
        "SAFE";

      plan.reason =
        "already-above-safe-floor";

      plans.push(plan);

      continue;
    }

    /*
      Abaixo do mínimo seguro:
      só aceitamos o preço produzido
      pelo mecanismo de proteção.
    */

    if (
      text(
        wanted?.priceSafetyStatus
      ) !==
      "raised-to-protected-minimum"
    ) {

      plan.action =
        "QUARANTINE";

      plan.reason =
        "below-floor-without-protected-status";

      plans.push(plan);

      continue;
    }

    if (
      masterPrice <
      minimumSafe -
      PRICE_TOLERANCE
    ) {

      plan.action =
        "QUARANTINE";

      plan.reason =
        "master-price-below-safe-floor";

      plans.push(plan);

      continue;
    }

    const ratio =
      masterPrice /
      plan.currentPrice;

    if (
      ratio >
      MAX_INCREASE_RATIO
    ) {

      plan.action =
        "QUARANTINE";

      plan.reason =
        "large-price-increase-hold";

      plans.push(plan);

      continue;
    }

    plan.action =
      "INCREASE";

    plan.reason =
      "protect-minimum-margin";

    plan.targetPrice =
      masterPrice;

    plans.push(plan);
  }

  /*
    Nenhuma Variant pode ser controlada
    por dois produtos ativos.
  */

  const byVariant =
    new Map();

  for (const plan of plans) {

    if (
      plan.action ===
        "QUARANTINE" ||
      !plan.variantId
    ) {
      continue;
    }

    const list =
      byVariant.get(
        plan.variantId
      ) || [];

    list.push(plan);

    byVariant.set(
      plan.variantId,
      list
    );
  }

  for (
    const list of
      byVariant.values()
  ) {

    if (
      list.length <= 1
    ) {
      continue;
    }

    for (const plan of list) {

      plan.action =
        "QUARANTINE";

      plan.reason =
        "duplicate-active-shopify-variant";
    }
  }

  const quarantine =
    plans.filter(
      x =>
        x.action ===
        "QUARANTINE"
    );

  const increases =
    plans.filter(
      x =>
        x.action ===
        "INCREASE"
    );

  const identityRatio =
    active.length
      ? identityMatched /
        active.length
      : 0;

  const priceIncreaseRatio =
    active.length
      ? increases.length /
        active.length
      : 0;

  const failures = [];

  if (
    active.length <
      MIN_ACTIVE_ROWS ||
    active.length >
      MAX_ACTIVE_ROWS
  ) {

    failures.push(
      `Active row count outside safety range: ${
        active.length
      }`
    );
  }

  if (
    master.length <
      100000 ||
    master.length >
      300000
  ) {

    failures.push(
      `Master row count outside safety range: ${
        master.length
      }`
    );
  }

  if (
    identityRatio <
    MIN_IDENTITY_RATIO
  ) {

    failures.push(
      `Identity ratio too low: ${(
        identityRatio * 100
      ).toFixed(4)}%`
    );
  }

  if (
    duplicateCatalogKeys.length
  ) {

    failures.push(
      `Duplicate active catalog keys: ${
        duplicateCatalogKeys.length
      }`
    );
  }

  if (
    quarantine.length >
    MAX_QUARANTINE
  ) {

    failures.push(
      `Too many quarantine rows: ${
        quarantine.length
      }`
    );
  }

  if (
    increases.length >
      MAX_PRICE_INCREASES ||
    priceIncreaseRatio >
      MAX_PRICE_INCREASE_RATIO
  ) {

    failures.push(
      `Too many price increases: ${
        increases.length
      } (${(
        priceIncreaseRatio * 100
      ).toFixed(2)}%)`
    );
  }

  const report = {
    generatedAt:
      new Date().toISOString(),

    mode:
      APPLY
        ? "apply"
        : "audit",

    policy: {
      activeOnly: true,
      automaticPriceDecrease:
        false,
      maximumAutomaticIncreaseRatio:
        MAX_INCREASE_RATIO,
      unmatchedActive:
        "stock-zero",
      ambiguousActive:
        "stock-zero",
      largeIncrease:
        "stock-zero",
      productDeletes:
        false
    },

    supabaseRows:
      products.length,

    masterRows:
      master.length,

    activeRows:
      active.length,

    identityMatched,

    identityUnmatched,

    identityAmbiguous,

    identityRatio,

    matchMethods,

    duplicateCatalogKeys:
      duplicateCatalogKeys.length,

    blockedDecrease,

    quarantinePlanned:
      quarantine.length,

    priceIncreasesPlanned:
      increases.length,

    priceIncreaseRatio,

    safetyReady:
      failures.length === 0,

    safetyFailures:
      failures,

    quarantineReasons:
      quarantine.reduce(
        (acc, item) => {

          acc[item.reason] =
            (
              acc[item.reason] ||
              0
            ) + 1;

          return acc;
        },
        {}
      ),

    writes: {
      supabasePriceIncreases: 0,
      supabaseStockZero: 0,
      shopifyPriceIncreases: 0,
      shopifyPriceDecreases: 0,
      productDeletes: 0
    },

    shopifyAlreadyHighEnough: 0,
    shopifyFailuresQuarantined: 0,

    criticalErrors: [],

    samples: {
      quarantine:
        quarantine
          .slice(0, 100)
          .map(x => ({
            catalogKey:
              x.catalogKey,
            sku:
              x.sku,
            reason:
              x.reason,
            currentPrice:
              x.currentPrice,
            minimumSafePrice:
              x.minimumSafePrice
          })),

      increases:
        increases
          .slice(0, 100)
          .map(x => ({
            catalogKey:
              x.catalogKey,
            sku:
              x.sku,
            currentPrice:
              x.currentPrice,
            minimumSafePrice:
              x.minimumSafePrice,
            targetPrice:
              x.targetPrice,
            method:
              x.matchMethod
          }))
    }
  };

  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(
      report,
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log(
    "========== SAFE ACTIVE PRICE AUDIT =========="
  );

  console.log(
    "Active rows:",
    report.activeRows
  );

  console.log(
    "Identity matched:",
    report.identityMatched
  );

  console.log(
    "Identity unmatched:",
    report.identityUnmatched
  );

  console.log(
    "Identity ambiguous:",
    report.identityAmbiguous
  );

  console.log(
    "Identity ratio:",
    report.identityRatio
  );

  console.log(
    "Blocked decreases:",
    report.blockedDecrease
  );

  console.log(
    "Quarantine planned:",
    report.quarantinePlanned
  );

  console.log(
    "Price increases planned:",
    report.priceIncreasesPlanned
  );

  console.log(
    "Price increase ratio:",
    report.priceIncreaseRatio
  );

  console.log(
    "Safety ready:",
    report.safetyReady
  );

  for (
    const failure of failures
  ) {

    console.log(
      "SAFETY:",
      failure
    );
  }

  console.log(
    "Report:",
    REPORT_FILE
  );

  if (!APPLY) {
    return;
  }

  if (failures.length) {

    throw new Error(
      "Safety gate failed. ZERO WRITES."
    );
  }

  const affected =
    new Set([
      ...quarantine.map(
        x => x.catalogKey
      ),
      ...increases.map(
        x => x.catalogKey
      )
    ]);

  const backupFile =
    path.join(
      OUT_DIR,
      `backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`
    );

  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      {
        generatedAt:
          new Date().toISOString(),

        rows:
          products.filter(
            row =>
              affected.has(
                text(row.catalog_key)
              )
          )
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log(
    "Backup:",
    backupFile
  );

  /*
    1. QUARENTENA
  */

  await runPool(
    quarantine,
    6,
    async item => {

      try {

        const saved =
          await patchSupabase(
            item.catalogKey,
            {
              stock_qty: 0,
              in_stock: false
            }
          );

        if (
          Number(
            saved.stock_qty || 0
          ) !== 0 ||
          saved.in_stock === true
        ) {

          throw new Error(
            "stock-zero verification failed"
          );
        }

        report.writes
          .supabaseStockZero++;

      }
      catch (error) {

        report.criticalErrors.push({
          phase:
            "quarantine",

          catalogKey:
            item.catalogKey,

          error:
            error?.message ||
            String(error)
        });
      }
    }
  );

  /*
    2. PREÇOS NO SUPABASE
  */

  const priceSuccess = [];

  await runPool(
    increases,
    6,
    async item => {

      try {

        const wanted =
          item.master;

        const body = {
          price:
            item.targetPrice,

          minimum_safe_price:
            item.minimumSafePrice,

          price_safety_status:
            text(
              wanted?.priceSafetyStatus
            ) ||
            "raised-to-protected-minimum",

          price_rule:
            text(
              wanted?.priceRule
            ) ||
            "minimum-safe-price"
        };

        const originalPrice =
          money(
            wanted?.originalPrice
          );

        const purchaseCost =
          money(
            wanted?.purchaseCostInclVat
          );

        if (
          originalPrice !== null
        ) {
          body.original_price =
            originalPrice;
        }

        if (
          purchaseCost !== null
        ) {
          body.purchase_cost_incl_vat =
            purchaseCost;
        }

        const saved =
          await patchSupabase(
            item.catalogKey,
            body
          );

        if (
          Math.abs(
            Number(saved.price) -
            item.targetPrice
          ) >
          PRICE_TOLERANCE
        ) {

          throw new Error(
            "Supabase price verification failed"
          );
        }

        report.writes
          .supabasePriceIncreases++;

        priceSuccess.push(item);

      }
      catch (error) {

        /*
          Se o preço não puder ser
          protegido, retirar da venda.
        */

        try {

          await patchSupabase(
            item.catalogKey,
            {
              stock_qty: 0,
              in_stock: false
            }
          );

          report.writes
            .supabaseStockZero++;

        }
        catch (
          quarantineError
        ) {

          report.criticalErrors.push({
            phase:
              "supabase-price-and-quarantine",

            catalogKey:
              item.catalogKey,

            priceError:
              error?.message ||
              String(error),

            quarantineError:
              quarantineError?.message ||
              String(
                quarantineError
              )
          });
        }
      }
    }
  );

  /*
    3. SHOPIFY - SOMENTE SUBIDAS
  */

  const ids = [
    ...new Set(
      priceSuccess
        .map(x => x.variantId)
        .filter(Boolean)
    )
  ];

  const shopifyRows =
    await readShopifyVariants(ids);

  const byId =
    new Map(
      shopifyRows
        .filter(x => x?.id)
        .map(
          x => [x.id, x]
        )
    );

  const shopifyUpdates = [];

  for (
    const item of priceSuccess
  ) {

    const row =
      byId.get(
        item.variantId
      );

    if (
      !row?.id ||
      !row?.product?.id
    ) {

      try {

        await patchSupabase(
          item.catalogKey,
          {
            stock_qty: 0,
            in_stock: false
          }
        );

        report.writes
          .supabaseStockZero++;

        report
          .shopifyFailuresQuarantined++;

      }
      catch (error) {

        report.criticalErrors.push({
          phase:
            "shopify-missing-and-quarantine",

          catalogKey:
            item.catalogKey,

          error:
            error?.message ||
            String(error)
        });
      }

      continue;
    }

    const currentShopifyPrice =
      money(row.price);

    if (
      currentShopifyPrice === null
    ) {

      try {

        await patchSupabase(
          item.catalogKey,
          {
            stock_qty: 0,
            in_stock: false
          }
        );

        report.writes
          .supabaseStockZero++;

        report
          .shopifyFailuresQuarantined++;

      }
      catch (error) {

        report.criticalErrors.push({
          phase:
            "invalid-shopify-price",

          catalogKey:
            item.catalogKey,

          error:
            error?.message ||
            String(error)
        });
      }

      continue;
    }

    /*
      Shopify já igual ou mais alta:
      NUNCA baixar.
    */

    if (
      currentShopifyPrice >=
      item.targetPrice -
      PRICE_TOLERANCE
    ) {

      report
        .shopifyAlreadyHighEnough++;

      continue;
    }

    shopifyUpdates.push({
      ...item,
      shopifyRow: row
    });
  }

  await runPool(
    shopifyUpdates,
    4,
    async item => {

      try {

        await updateShopifyPrice(
          item.shopifyRow,
          item.targetPrice
        );

        report.writes
          .shopifyPriceIncreases++;

      }
      catch (error) {

        try {

          await patchSupabase(
            item.catalogKey,
            {
              stock_qty: 0,
              in_stock: false
            }
          );

          report.writes
            .supabaseStockZero++;

          report
            .shopifyFailuresQuarantined++;

        }
        catch (
          quarantineError
        ) {

          report.criticalErrors.push({
            phase:
              "shopify-price-and-quarantine",

            catalogKey:
              item.catalogKey,

            shopifyError:
              error?.message ||
              String(error),

            quarantineError:
              quarantineError?.message ||
              String(
                quarantineError
              )
          });
        }
      }
    }
  );

  report.finishedAt =
    new Date().toISOString();

  report.safetyComplete =
    report.criticalErrors.length === 0;

  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(
      report,
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log(
    "========== APPLY RESULT =========="
  );

  console.log(
    "Supabase price increases:",
    report.writes
      .supabasePriceIncreases
  );

  console.log(
    "Supabase stock zero:",
    report.writes
      .supabaseStockZero
  );

  console.log(
    "Shopify price increases:",
    report.writes
      .shopifyPriceIncreases
  );

  console.log(
    "Shopify price decreases:",
    report.writes
      .shopifyPriceDecreases
  );

  console.log(
    "Shopify already high enough:",
    report.shopifyAlreadyHighEnough
  );

  console.log(
    "Failures safely quarantined:",
    report
      .shopifyFailuresQuarantined
  );

  console.log(
    "Critical errors:",
    report.criticalErrors.length
  );

  console.log(
    "Safety complete:",
    report.safetyComplete
  );

  if (
    report.criticalErrors.length
  ) {
    process.exitCode = 2;
  }
}

main().catch(error => {

  console.error(
    "FATAL:",
    error?.stack || error
  );

  process.exitCode = 1;
});