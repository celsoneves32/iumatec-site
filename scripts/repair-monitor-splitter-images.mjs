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
        (content.startsWith("'") && content.endsWith("'"))) content = content.slice(1, -1);
    if (!(key in process.env)) process.env[key] = content;
  }
}
loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";
const APPLY = process.env.REPAIR_SPLITTER_IMAGE === "YES_REPAIR_CONFIRMED_PRODUCT";
const PRODUCT_ID = "gid://shopify/Product/15638477701504";
const TITLE_TOKEN = "Monitor Splitter USB Typ-C";
const CORRECT_URL = "https://cdn.competec.ch/images2/6/9/2/57684296/57684296_xxl3.jpg?export=Ga4PCo68TLLe9g";

if (!DOMAIN || !TOKEN) throw new Error("Missing Shopify credentials");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const READ = `query($id: ID!) { product(id: $id) { id title media(first: 20) { nodes { id mediaContentType ... on MediaImage { image { url } } } } } }`;
const ADD = `mutation($product: ProductUpdateInput!, $media: [CreateMediaInput!]) { productUpdate(product: $product, media: $media) { product { id } userErrors { field message } } }`;
const DELETE = `mutation($productId: ID!, $mediaIds: [ID!]!) { productDeleteMedia(productId: $productId, mediaIds: $mediaIds) { deletedMediaIds mediaUserErrors { field message } } }`;

async function graphql(query, variables) {
  const response = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors?.length) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
}

async function readProduct() {
  const product = (await graphql(READ, { id: PRODUCT_ID }))?.product;
  if (!product || !product.title.includes(TITLE_TOKEN)) throw new Error("Safety stop: unexpected product");
  return product;
}

async function run() {
  console.log("========== REPAIR MONITOR SPLITTER ==========");
  console.log(`Mode: ${APPLY ? "APPLY" : "PREVIEW ONLY"}`);
  const before = await readProduct();
  const oldImages = before.media.nodes.filter((item) => item.mediaContentType === "IMAGE");
  console.log(`Product: ${before.title}`);
  console.log(`Current images: ${oldImages.length}`);
  oldImages.forEach((item) => console.log(`OLD: ${item.image?.url || item.id}`));
  console.log(`Will add official image: ${CORRECT_URL}`);
  console.log(`Will remove the ${oldImages.length} image(s) currently present only after the official image is accepted.`);

  if (!APPLY) {
    console.log("Shopify changes: NONE");
    return;
  }
  if (oldImages.length !== 1) throw new Error(`Safety stop: expected 1 current image, found ${oldImages.length}`);

  const added = await graphql(ADD, {
    product: { id: PRODUCT_ID },
    media: [{ originalSource: CORRECT_URL, alt: "Delock Monitor Splitter USB-C zu DP HDMI VGA", mediaContentType: "IMAGE" }],
  });
  const addErrors = added?.productUpdate?.userErrors || [];
  if (addErrors.length) throw new Error(addErrors.map((item) => item.message).join(" | "));

  await sleep(5000);
  const afterAdd = await readProduct();
  const afterImages = afterAdd.media.nodes.filter((item) => item.mediaContentType === "IMAGE");
  if (afterImages.length < 2) throw new Error("Safety stop: official image was not accepted; old image was NOT removed");

  const deleted = await graphql(DELETE, { productId: PRODUCT_ID, mediaIds: oldImages.map((item) => item.id) });
  const deleteErrors = deleted?.productDeleteMedia?.mediaUserErrors || [];
  if (deleteErrors.length) throw new Error(deleteErrors.map((item) => item.message).join(" | "));

  console.log(`Official image added: 1`);
  console.log(`Old HP image removed: ${(deleted?.productDeleteMedia?.deletedMediaIds || []).length}`);
  console.log("Repair completed.");
  console.log("=============================================");
}
run().catch((error) => { console.error("FATAL:", error instanceof Error ? error.stack : String(error)); process.exit(1); });
