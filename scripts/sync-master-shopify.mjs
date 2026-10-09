import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i < 1) continue;
    const key = s.slice(0, i).trim();
    let value = s.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION || "2026-04";

const INPUT = process.env.SYNC_INPUT_FILE
  ? path.resolve(
      process.cwd(),
      process.env.SYNC_INPUT_FILE,
    )
  : path.join(
      ROOT,
      "integrations",
      "alltron",
      "out",
      "iumatec-master-candidates.json",
    );

const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-master-sync",
);

const STATE_FILE = path.join(OUT_DIR, "state.json");
const SUCCESS_FILE = path.join(OUT_DIR, "success.jsonl");
const ERROR_FILE = path.join(OUT_DIR, "errors.jsonl");

const CONCURRENCY = Math.max(
  1,
  Math.min(4, Number(process.env.SYNC_CONCURRENCY || 2)),
);

const MAX_PRODUCTS = Math.max(
  0,
  Number(process.env.SYNC_MAX_PRODUCTS || 0),
);

const DRY_RUN =
  String(process.env.SYNC_DRY_RUN || "false").toLowerCase() === "true";

if (!DOMAIN) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!TOKEN) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
if (!fs.existsSync(INPUT)) throw new Error(`Missing candidates file: ${INPUT}`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (v) => String(v ?? "").trim();
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function slugify(value) {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "-und-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 240);
}

function html(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function imageOf(p) {
  const values = [
    p.image,
    ...(Array.isArray(p.images) ? p.images : []),
    ...(Array.isArray(p.imageUrls) ? p.imageUrls : []),
  ];
  return values.find((v) => typeof v === "string" && /^https?:\/\//i.test(v)) || "";
}

function descriptionOf(p) {
  const a = text(p.description);
  const b = text(p.description2);
  const rows = [
    ["Artikelnummer", p.litm || p.alltronSku],
    ["Hersteller-Nr.", p.sku],
    ["EAN", p.ean],
    ["Garantie", p.warrantyMonths ? `${p.warrantyMonths} Monate` : ""],
  ].filter(([, v]) => text(v));

  return [
    a ? `<p>${html(a)}</p>` : "",
    b ? `<p>${html(b)}</p>` : "",
    rows.length
      ? `<table><tbody>${rows
          .map(([k, v]) => `<tr><th>${html(k)}</th><td>${html(v)}</td></tr>`)
          .join("")}</tbody></table>`
      : "",
  ].filter(Boolean).join("\n");
}

function categoryOf(p) {
  return (
    text(p?.iumatecCategory?.sub) ||
    text(p.subcategory) ||
    text(p?.rawCategory?.cat2) ||
    text(p?.iumatecCategory?.main) ||
    text(p.category) ||
    "Tech"
  );
}

function tagsOf(p) {
  return [...new Set([
    "alltron",
    "iumatec",
    text(p.brand),
    text(p?.iumatecCategory?.main),
    text(p?.iumatecCategory?.sub),
  ].filter(Boolean))];
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { success: {}, totals: { ok: 0, errors: 0 } };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function append(file, data) {
  fs.appendFileSync(file, `${JSON.stringify(data)}\n`, "utf8");
}

async function gql(query, variables = {}, attempt = 1) {
  const res = await fetch(
    `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  const body = await res.text();
  let json;
  try { json = JSON.parse(body); } catch { json = null; }

  const throttled =
    res.status === 429 ||
    json?.errors?.some((e) =>
      e?.extensions?.code === "THROTTLED" ||
      /throttled/i.test(e?.message || ""),
    );

  if (throttled && attempt <= 8) {
    const wait = Math.min(60000, 1000 * 2 ** (attempt - 1));
    console.log(`Throttled. Waiting ${wait} ms...`);
    await sleep(wait);
    return gql(query, variables, attempt + 1);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 1000)}`);
  if (!json) throw new Error("Invalid JSON from Shopify");
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(" | "));
  }

  return json.data;
}

async function getLocation() {
  const data = await gql(`
    query {
      locations(first: 20, includeInactive: false) {
        nodes { id name isActive fulfillsOnlineOrders }
      }
    }
  `);

  const list = data?.locations?.nodes || [];
  const location =
    list.find((x) => x.isActive && x.fulfillsOnlineOrders) ||
    list.find((x) => x.isActive);

  if (!location) throw new Error("No active Shopify location found");
  return location;
}

async function getPublication() {
  try {
    const data = await gql(`
      query {
        publications(first: 50) {
          nodes { id name app { id } }
        }
      }
    `);

    const list = data?.publications?.nodes || [];

    return (
      list.find((x) =>
        /online store|onlineshop|boutique en ligne/i.test(x.name || ""),
      ) ||
      list.find((x) => String(x?.app?.id || "").endsWith("/580111")) ||
      null
    );
  } catch {
    return null;
  }
}

const SHOPIFY_DEDUPE_LOOKUP = `
  query ShopifyDedupeLookup(
    $variantQuery: String!
    $productQuery: String!
  ) {
    productVariants(
      first: 50
      query: $variantQuery
    ) {
      nodes {
        id
        sku
        barcode
        product {
          id
          handle
          title
        }
      }
    }

    products(
      first: 10
      query: $productQuery
    ) {
      nodes {
        id
        handle
        title
      }
    }
  }
`;
const PRODUCT_SET = `
  mutation SyncProduct(
    $input: ProductSetInput!
    $identifier: ProductSetIdentifiers
  ) {
    productSet(
      synchronous: true
      input: $input
      identifier: $identifier
    ) {
      product {
        id
        handle
        variants(first: 1) {
          nodes { id sku price }
        }
      }
      userErrors { field message }
    }
  }
`;

const PUBLISH = `
  mutation PublishProduct($id: ID!, $publicationId: ID!) {
    publishablePublish(
      id: $id
      input: [{ publicationId: $publicationId }]
    ) {
      publishable {
        publishedOnPublication(publicationId: $publicationId)
      }
      userErrors { field message }
    }
  }
`;

function variablesFor(p, locationId) {
  const title = text(p.fullTitle || p.title || p.sku || p.litm);
  const sku = text(p.sku || p.internalNumber || p.litm);
  const handle = slugify(p.slug || `${title}-${p.litm || sku}`);
  const price = num(p.ecpr) > 0 ? num(p.ecpr) : num(p.price);
  const stock = Math.max(0, Math.floor(num(p.stockQty ?? p.stock)));
  const image = imageOf(p);

  const input = {
    title: title.slice(0, 255),
    handle,
    descriptionHtml: descriptionOf(p),
    vendor: text(p.brand) || "IUMATEC",
    productType: categoryOf(p),
    status: "ACTIVE",
    tags: tagsOf(p),
    productOptions: [{
      name: "Title",
      position: 1,
      values: [{ name: "Default Title" }],
    }],
    variants: [{
      sku: sku.slice(0, 255),
      price: price.toFixed(2),
      taxable: true,
      inventoryPolicy: "DENY",
      optionValues: [{
        optionName: "Title",
        name: "Default Title",
      }],
      inventoryItem: { tracked: true },
      inventoryQuantities: [{
        locationId,
        name: "available",
        quantity: stock,
      }],
    }],
    metafields: [{
      namespace: "iumatec",
      key: "alltron_litm",
      type: "single_line_text_field",
      value: text(p.litm || p.alltronSku),
    }],
  };

  if (text(p.ean)) input.variants[0].barcode = text(p.ean);

  if (image) {
    input.files = [{
      originalSource: image,
      alt: title.slice(0, 512),
      contentType: "IMAGE",
    }];
  }

  return {
    input,
    identifier: { handle },
    meta: { title, sku, handle, price, stock },
  };
}

async function publishProduct(productId, publicationId) {
  if (!publicationId) return false;

  const data = await gql(PUBLISH, { id: productId, publicationId });
  const payload = data?.publishablePublish;
  const errors = payload?.userErrors || [];

  if (errors.length) {
    throw new Error(errors.map((e) => e.message).join(" | "));
  }

  return Boolean(payload?.publishable?.publishedOnPublication);
}

function shopifyQueryValue(value) {
  return `"${text(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')}"`;
}

function normalizeSku(value) {
  return text(value).toUpperCase();
}

async function resolveShopifyIdentity(p, prepared) {
  const sku = normalizeSku(
    prepared?.meta?.sku ??
    p.sku ??
    p.internalNumber ??
    p.mpn ??
    p.litm,
  );

  const ean = text(
    p.ean ??
    p.barcode ??
    p.gtin,
  );

  const handle = text(
    prepared?.meta?.handle,
  );

  const variantTerms = [];

  if (sku) {
    variantTerms.push(
      `sku:${shopifyQueryValue(sku)}`,
    );
  }

  if (ean) {
    variantTerms.push(
      `barcode:${shopifyQueryValue(ean)}`,
    );
  }

  const variantQuery =
    variantTerms.length
      ? variantTerms.join(" OR ")
      : 'sku:"__IUMATEC_NO_MATCH__"';

  const productQuery =
    handle
      ? `handle:${shopifyQueryValue(handle)}`
      : 'handle:"__IUMATEC_NO_MATCH__"';

  const data = await gql(
    SHOPIFY_DEDUPE_LOOKUP,
    {
      variantQuery,
      productQuery,
    },
  );

  const variants =
    data?.productVariants?.nodes || [];

  const products =
    data?.products?.nodes || [];

  const skuMatches = sku
    ? variants.filter(
        (variant) =>
          normalizeSku(variant?.sku) === sku,
      )
    : [];

  const eanMatches = ean
    ? variants.filter(
        (variant) =>
          text(variant?.barcode) === ean,
      )
    : [];

  const handleMatches = handle
    ? products.filter(
        (product) =>
          text(product?.handle) === handle,
      )
    : [];

  if (
    skuMatches.length > 1 ||
    eanMatches.length > 1 ||
    handleMatches.length > 1
  ) {
    return {
      status: "BLOCKED_AMBIGUOUS",
      reason:
        `skuMatches=${skuMatches.length},` +
        `eanMatches=${eanMatches.length},` +
        `handleMatches=${handleMatches.length}`,
      identifier: null,
    };
  }

  const skuVariant =
    skuMatches[0] || null;

  const eanVariant =
    eanMatches[0] || null;

  if (
    skuVariant &&
    eanVariant &&
    skuVariant.id !== eanVariant.id
  ) {
    return {
      status: "BLOCKED_DUPLICATE_CONFLICT",
      reason:
        `SKU and EAN point to different variants: ` +
        `${skuVariant.id} != ${eanVariant.id}`,
      identifier: null,
    };
  }

  const matchedVariant =
    eanVariant || skuVariant || null;

  const handleProduct =
    handleMatches[0] || null;

  if (matchedVariant) {
    const productId =
      matchedVariant?.product?.id || "";

    if (!productId) {
      return {
        status: "BLOCKED_INVALID_MATCH",
        reason: "Matched variant has no product id",
        identifier: null,
      };
    }

    if (
      handleProduct &&
      handleProduct.id !== productId
    ) {
      return {
        status: "BLOCKED_HANDLE_CONFLICT",
        reason:
          `SKU/EAN product ${productId} differs from ` +
          `handle product ${handleProduct.id}`,
        identifier: null,
      };
    }

    return {
      status: "SAFE_EXISTING",
      reason: eanVariant
        ? "matched-exact-ean"
        : "matched-exact-sku",
      identifier: {
        id: productId,
      },
      productId,
      variantId: matchedVariant.id,
    };
  }

  if (handleProduct) {
    return {
      status: "BLOCKED_HANDLE_ONLY",
      reason:
        `Handle already exists without exact SKU/EAN match: ${handle}`,
      identifier: null,
      productId: handleProduct.id,
    };
  }

  return {
    status: "SAFE_NEW",
    reason: "no-existing-shopify-match",
    identifier: prepared.identifier,
    productId: null,
    variantId: null,
  };
}
async function syncProduct(p, location, publication) {
  const prepared = variablesFor(p, location.id);

  const identity =
    await resolveShopifyIdentity(
      p,
      prepared,
    );

  if (
    identity.status.startsWith("BLOCKED_")
  ) {
    throw new Error(
      `${identity.status}: ${identity.reason}`,
    );
  }

  if (DRY_RUN) {
    return {
      dryRun: true,
      ...prepared.meta,
      dedupeStatus: identity.status,
      dedupeReason: identity.reason,
      matchedProductId:
        identity.productId || null,
      matchedVariantId:
        identity.variantId || null,
    };
  }

  const data = await gql(PRODUCT_SET, {
    input: prepared.input,
    identifier: identity.identifier,
  });

  const payload = data?.productSet;
  const errors = payload?.userErrors || [];

  if (errors.length) {
    throw new Error(
      errors
        .map((e) =>
          `${Array.isArray(e.field) ? e.field.join(".") + ": " : ""}${e.message}`,
        )
        .join(" | "),
    );
  }

  const product = payload?.product;
  if (!product?.id) throw new Error("productSet returned no product");

  let published = false;
  try {
    published = await publishProduct(product.id, publication?.id);
  } catch (error) {
    console.warn(`Publication warning: ${error.message}`);
  }

  return {
    ...prepared.meta,
    shopifyProductId: product.id,
    shopifyProductHandle: product.handle,
    shopifyVariantId: product?.variants?.nodes?.[0]?.id || "",
    published,
  };
}

async function main() {
  const all = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  if (!Array.isArray(all)) throw new Error("Candidates JSON is not an array");

  const state = readState();

  let pending = all.filter((p) => {
    const sku = text(p.sku).toUpperCase();
    return sku && !p.alreadyLinkedToShopify && !state.success[sku];
  });

  if (MAX_PRODUCTS > 0) pending = pending.slice(0, MAX_PRODUCTS);

  console.log("========== IUMATEC MASTER SYNC ==========");
  console.log("Candidates:", all.length);
  console.log("Pending this run:", pending.length);
  console.log("Concurrency:", CONCURRENCY);
  console.log("Dry run:", DRY_RUN);
  console.log("Selling price: ECPR");
  console.log("=========================================");

  if (!pending.length) return;

  const location = DRY_RUN
    ? { id: "gid://shopify/Location/DRY_RUN", name: "DRY RUN" }
    : await getLocation();

  const publication = DRY_RUN ? null : await getPublication();

  console.log(`Location: ${location.name}`);
  console.log(
    publication
      ? `Publication: ${publication.name}`
      : "Publication not resolved; products will still be created.",
  );

  let cursor = 0;
  let ok = 0;
  let failed = 0;

  async function worker(id) {
    while (true) {
      const index = cursor++;
      if (index >= pending.length) return;

      const p = pending[index];
      const sku = text(p.sku).toUpperCase();
      const title = text(p.fullTitle || p.title || sku);

      try {
        const result = await syncProduct(p, location, publication);

        if (!DRY_RUN) {
          state.success[sku] = {
            at: new Date().toISOString(),
            productId: result.shopifyProductId,
            variantId: result.shopifyVariantId,
            handle: result.shopifyProductHandle,
            published: result.published,
          };
          state.totals.ok += 1;
          append(SUCCESS_FILE, { at: new Date().toISOString(), sku, ...result });
        }

        ok += 1;

        if (DRY_RUN) {
          console.log(
            `[${index + 1}/${pending.length}] ${
              result.dedupeStatus || "DRY_RUN_OK"
            } W${id}: ${title} | ${
              result.dedupeReason || ""
            }`,
          );
        } else {
          console.log(
            `[${index + 1}/${pending.length}] OK W${id}: ${title}`,
          );
        }
      } catch (error) {
        failed += 1;

        if (!DRY_RUN) {
          state.totals.errors += 1;
          append(ERROR_FILE, {
            at: new Date().toISOString(),
            sku,
            title,
            error:
              error instanceof Error
                ? error.message
                : String(error),
          });
        }

        console.error(
          `[${index + 1}/${pending.length}] ERROR W${id}: ${title} | ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      if (!DRY_RUN && (ok + failed) % 10 === 0) saveState(state);
      await sleep(150);
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)),
  );

  if (!DRY_RUN) saveState(state);

  console.log("========== FINISHED ==========");
  console.log("Successful:", ok);
  console.log("Errors:", failed);
  console.log("State:", STATE_FILE);
  console.log("==============================");
}

main().catch((error) => {
  console.error("FATAL:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
