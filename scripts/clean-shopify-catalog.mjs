import "dotenv/config";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_ADMIN_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

const APPLY = process.argv.includes("--apply");

if (!SHOPIFY_STORE_DOMAIN) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!SHOPIFY_ADMIN_ACCESS_TOKEN) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");

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

  if (!res.ok) throw new Error(`Shopify HTTP ${res.status}: ${JSON.stringify(json)}`);
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join(" | "));

  return json.data;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const KEEP_KEYWORDS = [
  "laptop", "notebook", "thinkpad", "elitebook", "latitude", "macbook",
  "desktop", "workstation", "mini pc", "nuc",
  "monitor", "display", "bildschirm", "aoc", "philips", "iiyama", "dell",
  "grafikkarte", "gpu", "nvidia", "geforce", "radeon", "quadro",
  "ram", "arbeitsspeicher", "ddr4", "ddr5",
  "mainboard", "netzteil", "power supply",
  "router", "switch", "mesh", "wlan", "wifi", "ethernet",
  "ssd", "nas", "synology", "qnap",
  "drucker", "printer", "laserjet",
  "tastatur", "keyboard", "maus", "mouse", "headset", "webcam", "dock", "docking",
  "smartphone", "iphone", "galaxy", "pixel", "tablet", "ipad"
];

const JUNK_KEYWORDS = [
  "juicer", "entsafter", "küchenmaschine", "kaffeemaschine", "bosch küchenmaschine",
  "baby", "nähmaschine", "luftbefeuchter", "luftentfeuchter",
  "whiteboard", "monhalt", "filter", "privacy filter",
  "wood", "gigaset baby", "princess", "gastroback", "vonxy",
  "peerless-av", "neomounts", "dicota secret", "rechner prime", "graphikrechner"
];

function productText(product) {
  return normalize([
    product.title,
    product.handle,
    product.vendor,
    product.productType,
    ...(product.tags || []),
    ...(product.collections?.nodes || []).map((c) => c.title),
    ...(product.collections?.nodes || []).map((c) => c.handle),
  ].join(" "));
}

function shouldKeep(product) {
  const text = productText(product);

  const isJunk = JUNK_KEYWORDS.some((word) => text.includes(normalize(word)));
  if (isJunk) return false;

  return KEEP_KEYWORDS.some((word) => text.includes(normalize(word)));
}

async function getProducts() {
  const query = `
    query Products($cursor: String) {
      products(first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          handle
          vendor
          productType
          status
          tags
          collections(first: 20) {
            nodes {
              title
              handle
            }
          }
        }
      }
    }
  `;

  let cursor = null;
  const products = [];

  while (true) {
    const data = await shopifyAdmin(query, { cursor });
    products.push(...data.products.nodes);

    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  return products;
}

async function setProductDraft(productId) {
  const mutation = `
    mutation ProductUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          title
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyAdmin(mutation, {
    input: {
      id: productId,
      status: "DRAFT",
    },
  });

  const errors = data.productUpdate.userErrors || [];
  if (errors.length) {
    throw new Error(errors.map((e) => e.message).join(" | "));
  }

  return data.productUpdate.product;
}

async function main() {
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY RUN");
  console.log("Loading products...");

  const products = await getProducts();

  let keep = 0;
  let draft = 0;

  for (const product of products) {
    const keepProduct = shouldKeep(product);

    if (keepProduct) {
      keep++;
      console.log(`KEEP: ${product.title}`);
      continue;
    }

    draft++;
    console.log(`${APPLY ? "DRAFT" : "WOULD DRAFT"}: ${product.title}`);

    if (APPLY && product.status !== "DRAFT") {
      await setProductDraft(product.id);
    }
  }

  console.log("DONE");
  console.log({ total: products.length, keep, draft });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});