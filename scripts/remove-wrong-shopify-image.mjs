import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    const separator = value.indexOf("=");
    if (separator < 1) continue;
    const key = value.slice(0, separator).trim();
    let content = value.slice(separator + 1).trim();
    if ((content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith("'") && content.endsWith("'"))) {
      content = content.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = content;
  }
}

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";
const APPLY = process.env.REMOVE_WRONG_IMAGE === "YES_REMOVE_CONFIRMED_IMAGE";

// Confirmed manually on 22 July 2026.
const PRODUCT_ID = "gid://shopify/Product/15638477701504";
const WRONG_IMAGE_TOKEN = "57684296";
const EXPECTED_TITLE_TOKEN = "Monitor Splitter USB Typ-C";

if (!DOMAIN) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!TOKEN) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");

const QUERY = `
  query ProductMedia($id: ID!) {
    product(id: $id) {
      id
      title
      media(first: 50) {
        nodes {
          id
          mediaContentType
          ... on MediaImage { image { url } }
        }
      }
    }
  }
`;

const DELETE = `
  mutation DeleteWrongMedia($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      deletedProductImageIds
      mediaUserErrors { field message }
    }
  }
`;

async function graphql(query, variables) {
  const response = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors?.length) {
    throw new Error(`Shopify error: ${JSON.stringify(json.errors || json)}`);
  }
  return json.data;
}

async function run() {
  console.log("========== REMOVE CONFIRMED WRONG IMAGE ==========");
  console.log(`Mode: ${APPLY ? "APPLY" : "PREVIEW ONLY"}`);

  const data = await graphql(QUERY, { id: PRODUCT_ID });
  const product = data?.product;
  if (!product) throw new Error(`Product not found: ${PRODUCT_ID}`);
  if (!product.title.includes(EXPECTED_TITLE_TOKEN)) {
    throw new Error(`Safety stop: unexpected product title: ${product.title}`);
  }

  const images = (product.media?.nodes || []).filter((media) => media.mediaContentType === "IMAGE");
  const wrong = images.filter((media) => String(media.image?.url || "").includes(WRONG_IMAGE_TOKEN));

  console.log(`Product: ${product.title}`);
  console.log(`Images currently: ${images.length}`);
  console.log(`Confirmed wrong images found: ${wrong.length}`);
  for (const media of wrong) console.log(`- ${media.image.url}`);

  if (wrong.length !== 1) {
    throw new Error(`Safety stop: expected exactly 1 wrong image, found ${wrong.length}`);
  }

  if (!APPLY) {
    console.log("Shopify changes: NONE");
    console.log("Run with REMOVE_WRONG_IMAGE=YES_REMOVE_CONFIRMED_IMAGE to delete it.");
    return;
  }

  const result = await graphql(DELETE, {
    productId: PRODUCT_ID,
    mediaIds: wrong.map((media) => media.id),
  });
  const payload = result?.productDeleteMedia;
  if (payload?.mediaUserErrors?.length) {
    throw new Error(payload.mediaUserErrors.map((error) => error.message).join(" | "));
  }
  console.log(`Deleted media: ${(payload?.deletedMediaIds || []).length}`);
  console.log("Only the confirmed HP toner image was removed.");
  console.log("==================================================");
}

run().catch((error) => {
  console.error("FATAL:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
